import {
  BaseURL,
  ZClientBidirectionalProtocolBase,
} from '../../../core/protocols/client-protocol-base';
import { ZRPC } from '../../../zrpc';
import { ZSocket } from './socket/socket';
import { WsClientCallerBuilder } from './ws-client-caller-builder';
import { WsClientHandlerBuilder } from './ws-client-handler-builder';
import { ClientWSConfig } from './ws-client-types';

export class ZWSClient<
  ZAPI extends ZRPC
> extends ZClientBidirectionalProtocolBase<ZAPI, ClientWSConfig> {
  protected caller: WsClientCallerBuilder<ZAPI>;

  protected handler: WsClientHandlerBuilder<ZAPI>;

  public readonly socket!: ZSocket;

  constructor(protected def: ZAPI, protected config: ClientWSConfig = {}) {
    super();

    this.config.url ||= (window.location.origin + '/') as BaseURL;
    this.config.responseTimeout ||= 30000;

    this.socket = new ZSocket(def, this.config);

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
}
