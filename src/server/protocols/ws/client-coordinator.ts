import { ZRPC } from '../../../zrpc';
import { WsClient } from './client';
import { WSServerClientCallerBuilder } from './client-caller-builder';
import { WSServerClientHandlerBuilder } from './client-handler-builder';
import { SocketHandler } from './socket';

export class WsClientCoordinator<ZAPI extends ZRPC> {
  private isAlive = true;

  private client!: WsClient<ZAPI>;

  private socket!: SocketHandler;

  protected caller!: WSServerClientCallerBuilder<ZAPI>;

  protected handler!: WSServerClientHandlerBuilder<ZAPI>;

  constructor(private api: ZAPI, private clientId: string) {
    this.client = new WsClient(clientId);
    this.caller = new WSServerClientCallerBuilder(api, this.client);
    this.handler = new WSServerClientHandlerBuilder(api, this.client);
  }

  get handle() {
    return this.handler.methods;
  }

  setSocket(socket: SocketHandler) {
    this.socket = socket;
    this.caller.setSocket(socket);
    this.handler.setSocket(socket);
  }

  getClient(): WsClient<ZAPI> {
    return this.client;
  }

  ping() {
    this.socket.ping();
  }
}
