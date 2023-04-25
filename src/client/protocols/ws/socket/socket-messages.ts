import { AcceptPromise } from '../../../../core';
import {
  SocketMessage,
  SocketMessageSerializer,
  SocketMessageType,
} from '../../../../core/protocols/socket-messages-serializer';
import { ZRPC } from '../../../../zrpc';
import { ClientWSConfig } from '../ws-client-types';
import { SocketConnection, SocketEventMessage } from './socket-connection';

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

  constructor(
    protected api: ZRPC,
    protected config: ClientWSConfig,
    public connection: SocketConnection
  ) {
    this.init();
  }

  private init() {
    this.connection.procedureMessageHandler = (message: SocketEventMessage) => {
      this.handleMessage(message);
    };
  }

  private handleMessage(message: SocketEventMessage) {
    const buffer = Buffer.from(message.data);
    const packet = SocketMessageSerializer.decode(buffer);

    if (packet.messageType === SocketMessageType.Call) {
      this.callHandler(packet);
    } else {
      this.executeCallback(packet);
    }
  }

  private async callHandler(packet: SocketMessage) {
    const handler = this.proceduresHandlers.get(packet.procedureName);

    if (!handler) {
      return;
    }

    const dataParsers = this.api.proceduresDataParsers.get(
      packet.procedureName
    );

    const inputData = dataParsers.input.decode(Buffer.from(packet.dataBuffer));

    const callResponse = await handler(inputData);

    const responseBuffer = dataParsers.output.encode(callResponse);

    this.connection.sendPacket({
      ...packet,
      messageType: SocketMessageType.Callback,
      dataBuffer: responseBuffer,
    });
  }

  private executeCallback(message: SocketMessage) {
    const callback = this.callbacks.get(message.callId);

    if (!callback) {
      throw new Error(
        `Call response handler not found, procedure: ${message.procedureName}, call id: ${message.callId}`
      );
    }

    try {
      const dataParsers = this.api.proceduresDataParsers.get(
        message.procedureName
      );

      const outputData = dataParsers.output.decode(
        Buffer.from(message.dataBuffer)
      );

      callback.resolve(outputData);
    } catch (err) {
      callback.reject(err as Error);
    } finally {
      this.callbacks.delete(message.callId);
    }
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
        (procedure: string, cid: number) => {
          reject(
            new Error(`Call timeout, procedure: ${procedure}, call id: ${cid}`)
          );
        },
        this.config.responseTimeout,
        procedureName,
        callId
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
