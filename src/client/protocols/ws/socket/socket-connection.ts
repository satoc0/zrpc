/* eslint-disable @typescript-eslint/no-use-before-define */
import {
  PING_BUFFER,
  PONG_BUFFER,
  PingPongMessage,
  SocketMessage,
  SocketMessageParser,
  isPingOrPongBufferMessage,
} from '../../../../core/protocols/socket-messages';
import { ZRPC } from '../../../../zrpc';
import { ClientWSConfig } from '../client-types';

export type SocketEventMessage = MessageEvent<ArrayBuffer>;

const LATENCY_ASSUMPTION_MS = 1000;

enum LocalDisconnectionReasons {
  NetworkConnectionList = 'network-connection-lost',
  Destroyed = 'destroyed',
}

const explicitDisconnectionReasons: string[] = [
  LocalDisconnectionReasons.Destroyed,
];

export class SocketConnection {
  private isAlive = false;

  private ws!: WebSocket;

  private packetQueue: Set<Uint8Array> = new Set();

  private pingsIntervalId!: NodeJS.Timer;

  private pingTimeoutId!: NodeJS.Timeout;

  private currentReconnectionAttemps = 0;

  procedureMessageHandler!: (message: SocketEventMessage) => void;

  constructor(protected api: ZRPC, protected config: ClientWSConfig) {
    this.connect();
    this.addNetworkChangeEvents();
  }

  private addNetworkChangeEvents() {
    window.addEventListener('online', this.onNetworkOnline);
    window.addEventListener('offline', this.onNetworkOffline);
  }

  private removeNetworkChangeEvents() {
    window.removeEventListener('online', this.onNetworkOnline);
    window.removeEventListener('offline', this.onNetworkOffline);
  }

  private onNetworkOffline = () => {
    this.isAlive = false;
    this.cleanUpCurrentConnection();
    this.ws.close(0, LocalDisconnectionReasons.NetworkConnectionList);
  };

  private onNetworkOnline = () => {
    if (this.isAlive) return;

    this.connect();
  };

  public destroy() {
    this.removeNetworkChangeEvents();
    this.cleanUpCurrentConnection();
    this.ws.close(undefined, LocalDisconnectionReasons.Destroyed);
  }

  private isNotExplicitCloseReason(reason: string): boolean {
    return !explicitDisconnectionReasons.includes(reason);
  }

  private connect() {
    const initializeErrorOrCloseEventHandler = (ev: Event | CloseEvent) => {
      const isCloseEvent = ev instanceof CloseEvent;

      if (isCloseEvent && this.isNotExplicitCloseReason(ev.reason)) {
        this.handleCloseEvent(ev);
      } else {
        console.error(ev);
      }

      clearInitializeEvents();
    };

    const initializeOpenEventHandler = () => {
      clearTimeout(connectionTimeoutId);

      clearInitializeEvents();

      if (this.ws) {
        this.onReconnect();
      }

      this.ws = wsInstance;
      this.connectionEstablished();
    };

    const clearInitializeEvents = () => {
      wsInstance.removeEventListener('open', initializeOpenEventHandler);
      wsInstance.removeEventListener(
        'error',
        initializeErrorOrCloseEventHandler
      );
      wsInstance.removeEventListener(
        'close',
        initializeErrorOrCloseEventHandler
      );
    };

    const wsInstance = this.getWebSocketInstance();

    const connectionTimeoutId = setTimeout(() => {
      clearInitializeEvents();

      this.tryReconnect();
    }, this.config.connectionTimeout);

    wsInstance.addEventListener('open', initializeOpenEventHandler);
    wsInstance.addEventListener('error', initializeErrorOrCloseEventHandler);
    wsInstance.addEventListener('close', initializeErrorOrCloseEventHandler);
  }

  private connectionEstablished() {
    this.initPingPongGame();
    this.addMessageListenerForWSInstance(this.ws);
  }

  private tryReconnect() {
    setTimeout(() => {
      if (
        this.currentReconnectionAttemps === this.config.reconnectionMaxAttemps
      ) {
        console.error(new Error('Maximum reconnection attempts reached.'));
        this.currentReconnectionAttemps = 0;
        return;
      }

      this.connect();
      ++this.currentReconnectionAttemps;
    }, this.config.reconnectionTryInterval);
  }

  private getWebSocketInstance() {
    const ws = new WebSocket(this.config.url as string);
    ws.binaryType = 'arraybuffer';

    return ws;
  }

  private cleanUpCurrentConnection() {
    this.stopPingPongGame();
    this.removeMessageListenerForWSInstance(this.ws);
  }

  private handleCloseEvent(ev: CloseEvent) {
    if (this.isNotExplicitCloseReason(ev.reason)) {
      this.tryReconnect();
    }
  }

  private initPingPongGame() {
    this.pingsIntervalId = setInterval(() => {
      this.isAlive = false;

      this.ping();
    }, this.config.pingInterval);
  }

  private stopPingPongGame() {
    clearInterval(this.pingsIntervalId);
    clearInterval(this.pingTimeoutId);
  }

  private addMessageListenerForWSInstance(ws: WebSocket) {
    ws.addEventListener('message', this.onMessage);
  }

  private removeMessageListenerForWSInstance(ws: WebSocket) {
    ws.removeEventListener('message', this.onMessage);
  }

  private onMessage = (message: SocketEventMessage) => {
    switch (isPingOrPongBufferMessage(message.data)) {
      case PingPongMessage.Ping:
        this.sendPong();
        break;
      case PingPongMessage.Pong:
        this.onPong();
        break;
      default:
        this.procedureMessageHandler(message);
    }
  };

  private sendPong() {
    this.ws.send(PONG_BUFFER);
  }

  public ping() {
    this.ws.send(PING_BUFFER);
    this.isAlive = false;

    this.pingTimeoutId = setTimeout(() => {
      this.cleanUpCurrentConnection();
      this.tryReconnect();
    }, (this.config.pingTimeout as number) + LATENCY_ASSUMPTION_MS);
  }

  private onPong() {
    this.isAlive = true;
    this.sendQueuedPackets();
    clearTimeout(this.pingTimeoutId);
  }

  sendPacket(packet: SocketMessage) {
    const packetBuffer = SocketMessageParser.encode(packet);
    this.sendOrQueue(packetBuffer);
  }

  private sendOrQueue(buffer: Uint8Array) {
    if (this.isAlive) {
      this.ws.send(buffer);
    } else {
      this.queuePacket(buffer);
    }
  }

  private queuePacket(buffer: Uint8Array) {
    this.packetQueue.add(buffer);
  }

  private onReconnect() {
    this.sendQueuedPackets();
  }

  private sendQueuedPackets() {
    for (const bufferQueued of this.packetQueue) {
      this.removeFromQueue(bufferQueued);
      this.sendOrQueue(bufferQueued);
    }
  }

  private removeFromQueue(buffer: Uint8Array) {
    this.packetQueue.delete(buffer);
  }
}
