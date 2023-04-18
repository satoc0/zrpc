import { ApiProceduresMap } from '../../../core';
import { ZClientBidirectionalProtocolBase } from '../../../core/protocols/client-protocol-base';
import { ZRPC } from '../../../zrpc';
import { ZSocket } from './socket/socket';
import { WsClientCallerBuilder } from './client-caller-builder';
import { WsClientHandlerBuilder } from './client-handler-builder';
import { ClientWSConfig } from './client-types';

export class ZWSClient<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> extends ZClientBidirectionalProtocolBase<ZAPI, ClientWSConfig> {
  protected caller: WsClientCallerBuilder<ZAPI, Procedures>;

  protected handler: WsClientHandlerBuilder<ZAPI, Procedures>;

  public readonly socket!: ZSocket;

  constructor(protected def: ZAPI, protected config: ClientWSConfig = {}) {
    super();

    this.config.url ||= window.location.origin;
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
