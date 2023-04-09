import { ProcedureMiddlewareHandler } from './server-api-handler-constructor';

export type ServerConfig = {
  middlewares?: ProcedureMiddlewareHandler<object, any>[];
  adapter?: unknown;
};
