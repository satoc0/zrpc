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

  protected config!: ClientHttpConfig;

  constructor(protected def: ZAPI, config: ClientHttpConfig = {}) {
    super();
    this.config = { ...config };
    this.config.url ||= this.getBaseUrl();
    this.config.fetchClient ||= getFetchClient();

    this.caller = new HttpClientCallerBuilder(this.def, this.config);
  }

  private getBaseUrl(): BaseURL {
    if (typeof window === 'undefined') {
      return '/';
    }

    return (window.location.origin + '/') as BaseURL;
  }

  get call() {
    return this.caller.methods;
  }

  updateConfig(config: Partial<ClientHttpConfig>) {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ClientHttpConfig {
    return this.config;
  }
}
