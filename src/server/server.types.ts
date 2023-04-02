import { IncomingMessage, ServerResponse } from 'node:http';

export type MiddlewareHandler<T extends object> = (
  req: IncomingMessage,
  res: ServerResponse,
  data: T
) => Promise<void>;

export type ServerConfig = {
  middlewares?: MiddlewareHandler<object>[];
};
