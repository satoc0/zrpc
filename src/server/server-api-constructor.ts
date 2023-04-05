import {
  AcceptPromise,
  ApiProceduresMap,
  ApiProceduresSchemas,
  SchemaDefToType,
} from '../core';
import { ProcedureNotFound } from '../core/core-errors';
import { isProcedureSchema } from '../core/procedure-data';
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
> {
  private handlersMap: HandlerMap = new Map();

  public structor: ApiConstructorMap<Procedures> =
    {} as ApiConstructorMap<Procedures>;

  constructor(private def: ZAPI) {
    this.buildStructor(this.structor, this.def.apiDefinition.procedures);
  }

  private buildStructor(
    structor: ApiConstructorMap<Procedures>,
    map: ApiProceduresMap,
    procedurePathArr: string[] = []
  ) {
    for (const procedureName in map) {
      const procedure = map[procedureName];

      procedurePathArr.push(procedureName);

      if (isProcedureSchema(procedure)) {
        procedurePathArr.pop();

        const procedurePath: string = [...procedurePathArr, procedureName].join(
          '/'
        );

        structor[procedureName as keyof Procedures] = ((handler: any) => {
          const procedureHandler = new ProcedureHandler<any, any>(
            procedurePath as string,
            handler,
            []
          );
          this.handlersMap.set(procedurePath, procedureHandler);
        }) as any;
      } else {
        structor[procedureName as keyof ApiConstructorMap<Procedures>] =
          {} as any;

        this.buildStructor(
          structor[procedureName] as any,
          procedure,
          procedurePathArr
        );

        procedurePathArr.pop();
      }
    }
  }

  public getHandler(procedurePath: string) {
    const handler = this.handlersMap.get(procedurePath);

    if (!handler) {
      throw new ProcedureNotFound(procedurePath);
    }

    return handler;
  }
}
