import { AcceptPromise } from '../../../core';
import {
  BinaryPacketParser,
  Packet,
  PacketType,
} from '../../../core/protocols/binary-comunication';
import { ZRPC } from '../../../zrpc';
import { ZClientHttpConfig } from '../http';
import { Buffer } from 'buffer';

export type SubscriptionHandler = (input: object) => AcceptPromise<object>;
export type ResponseCallback = (err: Error | null, data: object | null) => void;

const MAX_CALL_ID = 255;

export class ZSocket {
  private callId = 0;

  public readonly ws!: WebSocket;

  private proceduresHandlers: Map<string, SubscriptionHandler> = new Map();

  private responseWaiters: Map<number, ResponseCallback> = new Map();

  constructor(protected api: ZRPC, protected config: ZClientHttpConfig) {
    this.ws = new WebSocket(this.config.url as string);
    this.init();
  }

  private init() {
    this.ws.binaryType = 'arraybuffer';

    this.ws.addEventListener('message', (message) => {
      const arrayBuffer = message.data as ArrayBuffer;
      const buffer = Buffer.from(arrayBuffer);
      this.handleMessage(buffer);
    });
  }

  private handleMessage(packetBuffer: Buffer) {
    const packet = BinaryPacketParser.decode(packetBuffer);

    if (packet.packetType === PacketType.Call) {
      this.callHandler(packet);
    } else {
      this.callResponseWaiter(packet);
    }
  }

  private async callHandler(packet: Packet) {
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

    this.sendPacket({
      ...packet,
      packetType: PacketType.CallReponse,
      dataBuffer: responseBuffer,
    });
  }

  private callResponseWaiter(packet: Packet) {
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

    this.sendPacket({
      packetType: PacketType.Call,
      callId,
      procedureName,
      dataBuffer,
    });

    return callId;
  }

  private sendPacket(packet: Packet) {
    const packetBuffer = BinaryPacketParser.encode(packet);
    this.ws.send(packetBuffer);
  }

  private getCallId(): number {
    const nextId = this.callId++;

    if (this.callId === MAX_CALL_ID) {
      this.callId = 0;
    }

    return nextId;
  }
}
