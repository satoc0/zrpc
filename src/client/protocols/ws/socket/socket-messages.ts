import { AcceptPromise } from '../../../../core';
import {
  SocketMessage,
  SocketMessageParser,
  SocketMessageType,
  isPingOrPongBufferMessage,
} from '../../../../core/protocols/ws/socket-message';
import { ZRPC } from '../../../../zrpc';
import { ClientWSConfig } from '../client-types';
import { SocketConnection, SocketEventMessage } from './socket-connection';

export type SubscriptionHandler = (input: object) => AcceptPromise<object>;
export type ResponseCallback = (err: Error | null, data: object | null) => void;

const MAX_CALL_ID = 255;

export class SocketMessages {
  private callId = 0;

  private proceduresHandlers: Map<string, SubscriptionHandler> = new Map();

  private responseWaiters: Map<number, ResponseCallback> = new Map();

  constructor(
    protected api: ZRPC,
    protected config: ClientWSConfig,
    public connection: SocketConnection
  ) {
    this.init();
  }

  private init() {
    this.connection
      .getWS()
      .addEventListener('message', (message: SocketEventMessage) => {
        if (isPingOrPongBufferMessage(message.data)) return;

        this.handleMessage(message);
      });
  }

  private handleMessage(message: SocketEventMessage) {
    const buffer = Buffer.from(message.data);
    const packet = SocketMessageParser.decode(buffer);

    if (packet.messageType === SocketMessageType.Call) {
      this.callHandler(packet);
    } else {
      this.callResponseWaiter(packet);
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
      messageType: SocketMessageType.CallReponse,
      dataBuffer: responseBuffer,
    });
  }

  private callResponseWaiter(packet: SocketMessage) {
    const callback = this.responseWaiters.get(packet.callId);

    if (!callback) {
      throw new Error(
        `Call response handler not found, procedure: ${packet.procedureName}, call id: ${packet.callId}`
      );
    }

    try {
      const dataParsers = this.api.proceduresDataParsers.get(
        packet.procedureName
      );

      const outputData = dataParsers.output.decode(
        Buffer.from(packet.dataBuffer)
      );

      callback(null, outputData);
    } catch (err) {
      callback(err as Error, null);
    } finally {
      this.responseWaiters.delete(packet.callId);
    }
  }

  public waitCallResponse(callId: number, callback: ResponseCallback) {
    this.responseWaiters.set(callId, callback);
  }

  public listen(
    procedurePath: string,
    subscriptionHandler: SubscriptionHandler
  ) {
    this.proceduresHandlers.set(procedurePath, subscriptionHandler);
  }

  public callRemoteProcedure(procedureName: string, data: object): number {
    const dataParsers = this.api.proceduresDataParsers.get(procedureName);

    const dataBuffer = dataParsers.input.encode(data);

    const callId = this.getCallId();

    this.connection.sendPacket({
      messageType: SocketMessageType.Call,
      callId,
      procedureName,
      dataBuffer,
    });

    return callId;
  }

  private getCallId(): number {
    const nextId = this.callId++;

    if (this.callId === MAX_CALL_ID) {
      this.callId = 0;
    }

    return nextId;
  }
}
