import type { Server } from 'node:http';
import { ZRPC } from '../../zrpc';
import { ApiBuilderBase } from '../builder/api-builder-base';

export type ServerConfig<
  MiddlewareHandler extends (...args: any[]) => void = (...args: any[]) => void
> = {
  middlewares?: MiddlewareHandler[];
};

export abstract class ZServerProtocolBase<ZAPI extends ZRPC = ZRPC> {
  protected abstract builder?: ApiBuilderBase;

  protected abstract api: ZAPI;

  protected abstract config?: ServerConfig;

  abstract handle?: ApiBuilderBase['methods'];

  public abstract attach(httpServer: Server): void;

  protected abstract runMiddlewares(...args: unknown[]): Promise<unknown>;
}
