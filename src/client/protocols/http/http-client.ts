import { ApiProceduresMap } from '../../../core';
import { ZClientProtocolBase } from '../../../core/protocols/client-protocol-base';
import { ZRPC } from '../../../zrpc';
import { HttpClientCallerBuilder } from './http-client-caller-builder';
import { ClientHttpConfig } from './http-client-types';

export class ZHttpClient<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> extends ZClientProtocolBase<ZAPI, ClientHttpConfig> {
  protected caller: HttpClientCallerBuilder<ZAPI, Procedures>;

  constructor(protected def: ZAPI, protected config: ClientHttpConfig = {}) {
    super();

    this.config.url ||= window.location.origin;

    this.caller = new HttpClientCallerBuilder(this.def, this.config);
  }

  get call() {
    return this.caller.methods;
  }

  updateConfig(config: Partial<ClientHttpConfig>) {
    this.config = { ...this.config, ...config };
  }
}
