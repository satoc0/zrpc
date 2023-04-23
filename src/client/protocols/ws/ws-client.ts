import {
  BaseURL,
  ZClientBidirectionalProtocolBase,
} from '../../../core/protocols/client-protocol-base';
import { ZRPC } from '../../../zrpc';
import {
  DEFAULT_CONNECTION_TIMEOUT,
  DEFAULT_PING_INTERVAL,
  DEFAULT_PING_TIMEOUT,
  DEFAULT_RESPONSE_TIMEOUT,
} from './constants';
import { ZSocket } from './socket/socket';
import { WsClientCallerBuilder } from './ws-client-caller-builder';
import { WsClientHandlerBuilder } from './ws-client-handler-builder';
import { ClientWSConfig, OnErrorHandler } from './ws-client-types';

export class ZWSClient<
  ZAPI extends ZRPC
> extends ZClientBidirectionalProtocolBase<ZAPI, ClientWSConfig> {
  protected caller: WsClientCallerBuilder<ZAPI>;

  protected handler: WsClientHandlerBuilder<ZAPI>;

  public readonly socket!: ZSocket;

  set onError(cb: OnErrorHandler) {
    this.socket.connection.onError = cb;
  }

  constructor(protected def: ZAPI, protected config: ClientWSConfig = {}) {
    super();

    this.config.url ||= (window.location.origin + '/') as BaseURL;
    this.config.getWebSocketClient ??= () => WebSocket;
    this.config.connectionTimeout ??= DEFAULT_CONNECTION_TIMEOUT;
    this.config.pingInterval ??= DEFAULT_PING_INTERVAL;
    this.config.pingTimeout ??= DEFAULT_PING_TIMEOUT;
    this.config.responseTimeout ??= DEFAULT_RESPONSE_TIMEOUT;
    this.config.reconnectionMaxAttemps ??= Infinity;

    this.socket = new ZSocket(def, this.config as Required<ClientWSConfig>);

    this.caller = new WsClientCallerBuilder(this.def, this.socket, this.config);

    this.handler = new WsClientHandlerBuilder(
      this.def,
      this.socket,
      this.config
    );
  }

  get call() {
    return this.caller.methods;
  }

  get handle() {
    return this.handler.methods;
  }

  updateConfig(config: Partial<ClientWSConfig>) {
    this.config = { ...this.config, ...config };
  }

  public destroy() {
    this.socket.destroy();
  }
}
