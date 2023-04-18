// eslint-disable-next-line import/no-extraneous-dependencies
import { MessageEvent, WebSocket } from 'ws';
import {
  PONG_BUFFER,
  PingPongMessage,
  SocketMessage,
  SocketMessageParser,
  SocketMessageType,
  isPingOrPongBufferMessage,
} from '../../../core/protocols/ws/socket-message';

export class SocketHandler {
  private isAlive = true;

  private packetQueue: Set<Uint8Array> = new Set();

  private pingsIntervalId!: NodeJS.Timer;

  private pingTimeoutId!: NodeJS.Timeout;

  private currentReconnectionAtemps = 0;

  private callHandler!: (message: SocketMessage) => void;

  private callResponseWaiter!: (message: SocketMessage) => void;

  constructor(public readonly wsClient: WebSocket) {
    wsClient.binaryType = 'arraybuffer';

    this.listenClientPingEvents();
    this.wsClient.on('pong', this.onPong);

    this.listenMessages();
  }

  private listenClientPingEvents() {
    this.wsClient.addEventListener('message', (message: MessageEvent) => {
      switch (isPingOrPongBufferMessage(message.data as ArrayBuffer)) {
        // For client ping custom implementation
        case PingPongMessage.Ping:
          this.sendPong();
          break;
        case PingPongMessage.Pong:
          break;
        default:
          this.handleMessage(message.data as ArrayBuffer);
      }
    });
  }

  private handleMessage(arrBuffer: ArrayBuffer) {
    const buffer = Buffer.from(arrBuffer);
    const packet = SocketMessageParser.decode(buffer);

    if (packet.messageType === SocketMessageType.Call) {
      this.callHandler(packet);
    } else {
      this.callResponseWaiter(packet);
    }
  }

  setCallHandler(handler: (message: SocketMessage) => void) {
    this.callHandler = handler;
  }

  setCallResponseWaiter(handler: (message: SocketMessage) => void) {
    this.callResponseWaiter = handler;
  }

  private sendPong() {
    this.wsClient.send(PONG_BUFFER);
  }

  private onPong = () => {
    this.isAlive = true;
  };

  ping() {
    if (!this.isAlive) this.wsClient.terminate();

    this.isAlive = false;
    this.wsClient.ping();
  }

  private listenMessages() {
    this.wsClient.addEventListener('message', () => {});
  }
}
