/* eslint-disable @typescript-eslint/no-use-before-define */
import {
  PING_BUFFER,
  PingPongMessage,
  SocketMessage,
  SocketMessageSerializer,
  isPingOrPongBufferMessage,
} from '../../../../core/protocols/socket-messages-serializer';
import { ZRPC } from '../../../../zrpc';
import { ClientWSConfig, OnErrorHandler } from '../ws-client-types';

export type MessageEventArrayBuffer = MessageEvent<ArrayBuffer>;

export enum LocalDisconnectionReasons {
  NetworkConnectionLost = 'network-connection-lost',
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

  private reconnectionTimeoutId!: NodeJS.Timeout;

  private currentReconnectionAttemps = 0;

  onError!: OnErrorHandler;

  procedureMessageHandler!: (message: MessageEventArrayBuffer) => void;

  constructor(protected api: ZRPC, protected config: Required<ClientWSConfig>) {
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
    this.ws.close(0, LocalDisconnectionReasons.NetworkConnectionLost);
  };

  private onNetworkOnline = () => {
    if (this.isAlive) return;

    this.connect();
  };

  public destroy() {
    this.removeNetworkChangeEvents();
    this.cleanUpCurrentConnection();
    clearTimeout(this.reconnectionTimeoutId);
    this.ws.close(undefined, LocalDisconnectionReasons.Destroyed);
  }

  private isNotExplicitCloseReason(reason: string): boolean {
    return !explicitDisconnectionReasons.includes(reason);
  }

  private connect() {
    const initializeErrorOrCloseEventHandler = (ev: Event | CloseEvent) => {
      const isCloseEvent = ev instanceof CloseEvent;

      if (isCloseEvent) {
        this.handleCloseEvent(ev);
      } else {
        this.onError?.(ev);
      }

      clearInitializeEvents();
    };

    const initializeOpenEventHandler = () => {
      clearTimeout(connectionTimeoutId);

      clearInitializeEvents();

      const isReconnect = !!this.ws;

      this.ws = wsInstance;
      this.connectionEstablished();

      if (isReconnect) {
        this.onReconnect();
      }
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

  private handleCloseEvent(ev: CloseEvent) {
    if (this.isNotExplicitCloseReason(ev.reason)) {
      this.tryReconnect();
    }
  }

  private connectionEstablished() {
    this.isAlive = true;
    this.initPingPongGame();
    this.addMessageListenerForWSInstance(this.ws);
  }

  private tryReconnect() {
    this.reconnectionTimeoutId = setTimeout(() => {
      ++this.currentReconnectionAttemps;

      if (
        this.currentReconnectionAttemps >= this.config.reconnectionMaxAttemps
      ) {
        this.onError?.(new Error('Maximum reconnection attempts reached.'));
        return;
      }

      this.connect();
    }, this.config.reconnectionTryInterval);
  }

  private getWebSocketInstance() {
    const webSocketClient = this.config.getWebSocketClient();
    const ws = new webSocketClient(this.config.url as string);
    ws.binaryType = 'arraybuffer';

    return ws;
  }

  private cleanUpCurrentConnection() {
    this.stopPingPongGame();
    this.removeMessageListenerForWSInstance(this.ws);
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

  private onMessage = (message: MessageEventArrayBuffer) => {
    switch (isPingOrPongBufferMessage(message.data)) {
      case PingPongMessage.Pong:
        this.onPong();
        break;
      case false:
        this.procedureMessageHandler(message);
    }
  };

  public ping() {
    this.ws.send(PING_BUFFER);
    this.isAlive = false;

    this.pingTimeoutId = setTimeout(() => {
      this.cleanUpCurrentConnection();
      this.tryReconnect();
    }, this.config.pingTimeout as number);
  }

  private onPong() {
    this.isAlive = true;
    this.sendQueuedPackets();
    clearTimeout(this.pingTimeoutId);
  }

  sendPacket(packet: SocketMessage) {
    const packetBuffer = SocketMessageSerializer.encode(packet);
    this.sendOrQueue(packetBuffer);
  }

  private sendOrQueue(buffer: Uint8Array) {
    if (this.isAlive) {
      this.ws.send(buffer);
    } else {
      this.enqueuePacket(buffer);
    }
  }

  private enqueuePacket(buffer: Uint8Array) {
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
