import { ApiProceduresMap } from '../../../core';
import { ZClientProtocolBase } from '../../../core/protocols/client-protocol-base';
import { ZRPC } from '../../../zrpc';
import { ZHttpClientCallerBuilder } from './http-client-caller-builder';
import { ZClientHttpConfig } from './http-client-types';

export class ZHttpClient<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> extends ZClientProtocolBase<ZAPI, ZClientHttpConfig> {
  protected caller: ZHttpClientCallerBuilder<ZAPI, Procedures>;

  constructor(protected def: ZAPI, protected config: ZClientHttpConfig = {}) {
    super();

    this.config.url ||= window.location.origin;

    this.caller = new ZHttpClientCallerBuilder(this.def, this.config);
  }

  get call() {
    return this.caller.methods;
  }

  updateConfig(config: Partial<ZClientHttpConfig>) {
    this.config = { ...this.config, ...config };
  }
}
