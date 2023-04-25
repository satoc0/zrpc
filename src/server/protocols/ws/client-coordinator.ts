import { WebSocket } from 'ws';
import { ZRPC } from '../../../zrpc';
import { WsClient } from './client';
import { WSServerClientCallerBuilder } from './client-caller-builder';
import { WSServerClientHandlerBuilder } from './client-handler-builder';
import { ZWSServer } from './server';
import { SocketHandler } from './socket';
import { ResponseCallbacksMap } from './types';
import { separateCallbackKey } from './utils';

const MAX_CALL_ID = 255;

export class ClientCoordinator<ZAPI extends ZRPC> {
  private callId = 0;

  get isAlive(): boolean {
    return this.socket.isAlive;
  }

  public client!: WsClient<ZAPI>;

  public socket!: SocketHandler<ZAPI>;

  public caller!: WSServerClientCallerBuilder<ZAPI>;

  public handler!: WSServerClientHandlerBuilder<ZAPI>;

  public messagesQueue: Set<Uint8Array> = new Set();

  constructor(
    public readonly clientId: string,
    public server: ZWSServer<ZAPI>,
    public proceduresCallbacksMap: ResponseCallbacksMap
  ) {
    this.caller = new WSServerClientCallerBuilder(this.server.api);
    this.handler = new WSServerClientHandlerBuilder(this.server.api);
    this.client = new WsClient(clientId, this.caller, this.handler);
  }

  setSocket(socket: WebSocket) {
    const isReconnection = !!this.socket;
    if (isReconnection) {
      this.socket.destroy();
    }

    this.socket = new SocketHandler(socket, this);

    if (isReconnection) {
      this.handleReconnection();
      this.server.onReconnection?.(this.client);
    } else {
      this.server.onConnection?.(this.client);
    }
  }

  private handleReconnection() {
    this.socket.sendQueuedPackets();
  }

  getClient(): WsClient<ZAPI> {
    return this.client;
  }

  ping() {
    this.socket.ping();
  }

  getNewCallId(): number {
    const nextId = this.callId++;

    if (this.callId === MAX_CALL_ID) {
      this.callId = 0;
    }

    return nextId;
  }

  unqueueMessage(buffer: Uint8Array) {
    this.messagesQueue.delete(buffer);
  }

  enqueueMessage(buffer: Uint8Array) {
    this.messagesQueue.add(buffer);
  }

  public destroy() {
    this.socket.destroy();
    this.removeCallbacksRegistry();
  }

  private removeCallbacksRegistry() {
    for (const [callbackKey, callback] of this.proceduresCallbacksMap) {
      const [clientId] = separateCallbackKey(callbackKey);

      if (clientId === this.clientId) {
        callback.reject?.(new Error('Client destroyed'));

        callback.resolve = undefined;
        callback.reject = undefined;

        this.proceduresCallbacksMap.delete(callbackKey);
      }
    }
  }
}
