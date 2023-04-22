import {
  BaseURL,
  ZClientProtocolBase,
} from '../../../core/protocols/client-protocol-base';
import { ZRPC } from '../../../zrpc';
import { HttpClientCallerBuilder } from './http-client-caller-builder';
import { ClientHttpConfig } from './http-client-types';
import { getFetchClient } from './utils';

export class ZHttpClient<ZAPI extends ZRPC> extends ZClientProtocolBase<
  ZAPI,
  ClientHttpConfig
> {
  protected caller: HttpClientCallerBuilder<ZAPI>;

  constructor(protected def: ZAPI, protected config: ClientHttpConfig = {}) {
    super();

    this.config.url ||= (window.location.origin + '/') as BaseURL;
    this.config.fetchClient ||= getFetchClient();

    this.caller = new HttpClientCallerBuilder(this.def, this.config);
  }

  get call() {
    return this.caller.methods;
  }

  updateConfig(config: Partial<ClientHttpConfig>) {
    this.config = { ...this.config, ...config };
  }
}
