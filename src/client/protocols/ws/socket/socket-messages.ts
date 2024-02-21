import { AcceptPromise } from '../../../../core';
import {
  CallTimeoutError,
  CallbackHandlerNotFoundError,
  ProcedureNotFoundError,
  ZError,
} from '../../../../core/core-errors';
import {
  SocketMessage,
  SocketMessageSerializer,
  SocketMessageType,
} from '../../../../core/protocols/socket-messages-serializer';
import { ZRPC } from '../../../../zrpc';
import { ClientWSConfig, OnErrorHandler } from '../ws-client-types';
import { SocketConnection, MessageEventArrayBuffer } from './socket-connection';

export type SubscriptionHandler = (input: object) => AcceptPromise<object>;
export type ResponseCallback = {
  timeoutId: NodeJS.Timeout;
  resolve: (input: object) => void;
  reject: (error: Error) => void;
};

const MAX_CALL_ID = 255;

export class SocketMessages {
  private callId = 0;

  private proceduresHandlers: Map<string, SubscriptionHandler> = new Map();

  private callbacks: Map<number, ResponseCallback> = new Map();

  onError!: OnErrorHandler;

  constructor(
    protected api: ZRPC,
    protected config: ClientWSConfig,
    public connection: SocketConnection
  ) {
    this.init();
  }

  private init() {
    this.connection.procedureMessageHandler = (
      message: MessageEventArrayBuffer
    ) => {
      this.handleMessage(message);
    };
  }

  private handleMessage(message: MessageEventArrayBuffer) {
    const buffer = Buffer.from(message.data);
    const packet = SocketMessageSerializer.decode(buffer);

    switch (packet.messageType) {
      case SocketMessageType.Call:
        this.callHandler(packet);
        break;
      case SocketMessageType.Callback:
        this.executeCallback(packet);
        break;
      case SocketMessageType.CallbackError:
        this.executeCallbackError(packet);
        break;
    }
  }

  private async callHandler(packet: SocketMessage) {
    const handler = this.proceduresHandlers.get(packet.procedureName);

    if (!handler) {
      const procedureNotFound = new ProcedureNotFoundError(
        packet.procedureName
      );
      this.connection.sendPacket({
        ...packet,
        messageType: SocketMessageType.CallbackError,
        dataBuffer: procedureNotFound.getResponseBuffer(),
      });
      return;
    }

    try {
      const dataParsers = this.api.proceduresDataParsers.get(
        packet.procedureName
      );

      const inputData = dataParsers.input.decode(
        Buffer.from(packet.dataBuffer)
      );

      const callResponse = await handler(inputData);

      const responseBuffer = dataParsers.output.encode(callResponse);

      this.connection.sendPacket({
        ...packet,
        messageType: SocketMessageType.Callback,
        dataBuffer: responseBuffer,
      });
    } catch (error) {
      packet.messageType = SocketMessageType.CallbackError;
      const responsePacket: Partial<SocketMessage> = {
        ...packet,
        messageType: SocketMessageType.CallbackError,
      };

      if (error instanceof ZError) {
        responsePacket.dataBuffer = error.getResponseBuffer();
      } else if (error instanceof Error) {
        const zError = new ZError({
          errorCode: '',
          message: error.message,
          procedureName: packet.procedureName,
        });

        responsePacket.dataBuffer = zError.getResponseBuffer();
      }

      this.connection.sendPacket(responsePacket as SocketMessage);
    }
  }

  private executeCallback(message: SocketMessage) {
    const callback = this.getCallbackHandler(message);

    if (!callback) {
      return;
    }

    try {
      const dataParsers = this.api.proceduresDataParsers.get(
        message.procedureName
      );

      const outputData = dataParsers.output.decode(
        Buffer.from(message.dataBuffer)
      );

      clearTimeout(callback.timeoutId);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      callback!.resolve(outputData);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      callback!.reject(err as Error);
    } finally {
      this.callbacks.delete(message.callId);
    }
  }

  private getCallbackHandler(
    message: SocketMessage
  ): ResponseCallback | undefined {
    const callback = this.callbacks.get(message.callId);

    if (!callback) {
      const error = new CallbackHandlerNotFoundError(
        message.procedureName,
        message.callId
      );

      if (this.onError) {
        this.onError(error);
      } else {
        console.error(error);
      }

      return;
    }

    return callback;
  }

  private executeCallbackError(message: SocketMessage) {
    const callback = this.getCallbackHandler(message);

    if (!callback) {
      return;
    }

    const error = ZError.factoryFromBuffer(message.dataBuffer);
    callback.reject(error);

    this.deleteProcedureCallback(message);
  }

  private deleteProcedureCallback(message: SocketMessage) {
    this.callbacks.delete(message.callId);
  }

  public listen(
    procedurePath: string,
    subscriptionHandler: SubscriptionHandler
  ) {
    this.proceduresHandlers.set(procedurePath, subscriptionHandler);
  }

  public callRemoteProcedure(
    procedureName: string,
    data: object
  ): Promise<object> {
    return new Promise((resolve, reject) => {
      const dataParsers = this.api.proceduresDataParsers.get(procedureName);
      const dataBuffer = dataParsers.input.encode(data);

      const callId = this.getCallId();

      const timeoutId = setTimeout(
        (procedure: string, cid: number, rejectRef: (reason?: any) => void) => {
          rejectRef(new CallTimeoutError(procedure, cid));
        },
        this.config.responseTimeout,
        procedureName,
        callId,
        reject
      );

      this.callbacks.set(callId, { resolve, reject, timeoutId });

      this.connection.sendPacket({
        messageType: SocketMessageType.Call,
        callId,
        procedureName,
        dataBuffer,
      });
    });
  }

  private getCallId(): number {
    const nextId = this.callId++;

    if (this.callId === MAX_CALL_ID) {
      this.callId = 0;
    }

    return nextId;
  }

  public destroy() {
    this.proceduresHandlers.clear();
    this.callbacks.clear();
  }
}
