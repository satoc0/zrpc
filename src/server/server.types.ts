import { ProcedureMiddlewareHandler } from './server-api-constructor';

export type ServerConfig = {
  middlewares?: ProcedureMiddlewareHandler<object, any>[];
};
