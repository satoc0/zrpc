import {
  AcceptPromise,
  ApiProceduresMap,
  ApiProceduresSchemas,
  SchemaDefToType,
} from '../core';
import { ApiConstructor } from '../core/api-constructor';
import { ProcedureNotFound } from '../core/core-errors';
import { ZRPC } from '../zrpc';
import { ProcedureHandler } from './procedure-handler';

export type ApiConstructorMap<
  Root extends ApiProceduresMap = ApiProceduresMap
> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? (
        handler: (
          input: SchemaDefToType<Root[Key]['input']>
        ) => AcceptPromise<SchemaDefToType<Root[Key]['output']>>
      ) => void
    : Root[Key] extends ApiProceduresMap
    ? ApiConstructorMap<Root[Key]>
    : never;
};

type HandlerMap = Map<string, ProcedureHandler<any, any>>;

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
    return (handler: any) => {
      const procedureHandler = new ProcedureHandler<any, any>(
        procedurePath as string,
        handler,
        []
      );
      this.handlersMap.set(procedurePath, procedureHandler);
    };
  }

  public getHandler(procedurePath: string) {
    const handler = this.handlersMap.get(procedurePath);

    if (!handler) {
      throw new ProcedureNotFound(procedurePath);
    }

    return handler;
  }
}
