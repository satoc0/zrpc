import { ZRPC } from '../../zrpc';
import { ApiBuilderBase } from '../builder/api-builder-base';

export type BaseURL = `${string}/`;

export interface ClientConfig {
  /**
   * Defaults to window.location.origin
   * should ends with `/`
   */
  url?: BaseURL;
}

export abstract class ZClientProtocolBase<
  ZAPI extends ZRPC = ZRPC,
  Config extends ClientConfig = ClientConfig
> {
  protected abstract caller: ApiBuilderBase;

  protected abstract api: ZAPI;

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
