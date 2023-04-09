import { IncomingMessage, ServerResponse } from 'http';
import {
  AcceptPromise,
  ApiProceduresMap,
  ApiProceduresSchemas,
  SchemaDefToType,
} from '../core';
import { ApiConstructor } from '../core/api-constructor';
import { ProcedureNotFound } from '../core/core-errors';
import { ZRPC } from '../zrpc';
import { ProcedureHandlerExecutor } from './procedure-handler-executor';
import { ZServerExecutionContext } from './request-context';

export type ProcedureHandlerFunction<
  Input extends object,
  Output,
  CTX = ZServerExecutionContext<Input>
> = (ctx: CTX) => AcceptPromise<Output>;

export type ProcedureMiddlewareHandler<
  Input extends object,
  CTX = ZServerExecutionContext<Input>
> = ProcedureHandlerFunction<Input, void, CTX>;

export type ProcedureParameters<Input> = {
  req: IncomingMessage;
  res: ServerResponse;
  input: Input;
};

type ProcedureMiddlewareSetter<
  HandlerSet,
  Schema extends ApiProceduresSchemas,
  CTX = ZServerExecutionContext<Schema['input']>
> = {
  use: (
    middlewareHandler: ProcedureMiddlewareHandler<
      SchemaDefToType<Schema['input']>,
      CTX
    >
  ) => HandlerSet;
};

type HandlerSetter<
  Schema extends ApiProceduresSchemas,
  CTX = ZServerExecutionContext<Schema['input']>
> = (
  handler: (ctx: CTX) => AcceptPromise<SchemaDefToType<Schema['output']>>
) => void;

type HandlerSetWrapper<
  Schema extends ApiProceduresSchemas,
  CTX = ZServerExecutionContext<SchemaDefToType<Schema['input']>>
> = HandlerSetter<Schema, CTX> &
  ProcedureMiddlewareSetter<HandlerSetter<Schema, CTX>, Schema, CTX>;

export type ApiConstructorMap<
  Root extends ApiProceduresMap = ApiProceduresMap
> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? HandlerSetWrapper<Root[Key]>
    : Root[Key] extends ApiProceduresMap
    ? ApiConstructorMap<Root[Key]>
    : never;
};

type HandlerMap = Map<string, ProcedureHandlerExecutor<any, any>>;

export class ServerApiConstructor<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> extends ApiConstructor {
  private handlersMap: HandlerMap = new Map();

  public readonly structor: ApiConstructorMap<Procedures> =
    {} as ApiConstructorMap<Procedures>;

  constructor(private def: ZAPI) {
    super();
    this.buildStructor(this.structor, this.def.apiDefinition.procedures);
  }

  protected methodStructor(procedurePath: string): (handler: any) => any {
    const procedureHandler = new ProcedureHandlerExecutor<any, any>(
      procedurePath as string
    );

    const handlerSet = (handler: ProcedureHandlerFunction<any, any>) => {
      procedureHandler.setHandler(handler);
      this.handlersMap.set(procedurePath, procedureHandler);
    };

    handlerSet.use = (handler: ProcedureHandlerFunction<any, any>) => {
      procedureHandler.setMiddlewares([handler]);
      this.handlersMap.set(procedurePath, procedureHandler);

      return handlerSet;
    };

    return handlerSet;
  }

  public getHandler(procedurePath: string) {
    const handler = this.handlersMap.get(procedurePath);

    if (!handler) {
      throw new ProcedureNotFound(procedurePath);
    }

    return handler;
  }
}
