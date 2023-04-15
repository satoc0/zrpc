import { AcceptPromise } from '../core';
import { Context } from './protocols/context-base';

export type ServerConfig<MiddlewareHandler> = {
  middlewares?: MiddlewareHandler[];
};

export type ProcedureHandlerFunction<
  Input extends object,
  Output extends object,
  CTX extends Context = Context<Input>
> = (ctx: CTX) => AcceptPromise<Output>;
