import { ZRPC } from '../../zrpc';
import { ApiBuilderBase } from '../builder/api-builder-base';

export interface ClientConfig {
  /**
   * Defaults to window.location.origin
   */
  url?: string;
}

export abstract class ZClientProtocolBase<
  ZAPI extends ZRPC = ZRPC,
  Config extends ClientConfig = ClientConfig
> {
  protected abstract caller: ApiBuilderBase;

  protected abstract def: ZAPI;

  protected abstract config?: Config;

  abstract call: ApiBuilderBase['methods'];
}

export abstract class ZClientBidirectionalProtocolBase<
  ZAPI extends ZRPC = ZRPC,
  Config extends ClientConfig = ClientConfig
> extends ZClientProtocolBase<ZAPI, Config> {
  protected abstract handler: ApiBuilderBase;

  abstract handle: ApiBuilderBase['methods'];
}
