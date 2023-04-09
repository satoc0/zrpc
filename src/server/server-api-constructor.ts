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

export type ProcedureHandlerFunction<Input, Output> = (
  params: ProcedureParameters<Input>
) => AcceptPromise<Output>;

export type ProcedureMiddlewareHandler<Input> = ProcedureHandlerFunction<
  Input,
  void
>;

export type ProcedureParameters<Input> = {
  req: IncomingMessage;
  res: ServerResponse;
  input: Input;
};

type ProcedureMiddlewareSetter<
  HandlerSet,
  Schema extends ApiProceduresSchemas
> = {
  use: (
    middlewareHandler: ProcedureMiddlewareHandler<
      SchemaDefToType<Schema['input']>
    >
  ) => HandlerSet;
};

type HandlerSetter<Schema extends ApiProceduresSchemas> = (
  handler: (
    params: ProcedureParameters<SchemaDefToType<Schema['input']>>
  ) => AcceptPromise<SchemaDefToType<Schema['output']>>
) => void;

export type ApiConstructorMap<
  Root extends ApiProceduresMap = ApiProceduresMap
> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? HandlerSetter<Root[Key]> &
        ProcedureMiddlewareSetter<HandlerSetter<Root[Key]>, Root[Key]>
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

    handlerSet.use = (handler: ProcedureHandlerFunction<unknown, unknown>) => {
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
