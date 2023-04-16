import { ApiProceduresMap } from '../../../core';
import { ZClientBidirectionalProtocolBase } from '../../../core/protocols/client-protocol-base';
import { ZRPC } from '../../../zrpc';
import { WsClientCallerBuilder } from './ws-client-caller-builder';
import { WsClientHandlerBuilder } from './ws-client-handler-builder';
import { ZClientWSConfig } from './ws-client-types';
import { ZSocket } from './ws-socket';

export class ZWSClient<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> extends ZClientBidirectionalProtocolBase<ZAPI, ZClientWSConfig> {
  protected caller: WsClientCallerBuilder<ZAPI, Procedures>;

  protected handler: WsClientHandlerBuilder<ZAPI, Procedures>;

  public readonly socket!: ZSocket;

  constructor(protected def: ZAPI, protected config: ZClientWSConfig = {}) {
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

  updateConfig(config: Partial<ZClientWSConfig>) {
    this.config = { ...this.config, ...config };
  }
}
