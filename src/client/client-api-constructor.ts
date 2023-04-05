import { ZRPC } from '../zrpc';
import { ApiProceduresMap, ApiProceduresSchemas } from '../core/api-definition';
import { ProcedureNotFound, ZError } from '../core/core-errors';
import { isProcedureSchema } from '../core/procedure-data';
import { SchemaDefToType } from '../core/types';
import { ZClientRequest } from './client-request';
import { ClientConfig } from './client.types';

export type ApiConstructorMap<
  Root extends ApiProceduresMap = ApiProceduresMap
> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? (
        input: SchemaDefToType<Root[Key]['input']>
      ) => Promise<SchemaDefToType<Root[Key]['output']>>
    : Root[Key] extends ApiProceduresMap
    ? ApiConstructorMap<Root[Key]>
    : never;
};

export class ZClientApiConstructor<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> {
  private handlersMap = new Map();

  public structor: ApiConstructorMap<Procedures> =
    {} as ApiConstructorMap<Procedures>;

  constructor(private def: ZAPI, private config?: ClientConfig) {
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

        structor[procedureName as keyof Procedures] = this.createCaller(
          procedurePath
        ) as any;
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

  private createCaller(procedurePath: string): (input: any) => Promise<any> {
    return async (input) => {
      const procedureData = this.def.proceduresDataParsers.get(procedurePath);

      const clientRequest = new ZClientRequest(procedureData, input);

      const requestBase: RequestInit = this.config?.requestBuilder
        ? await this.config.requestBuilder()
        : {};

      const response = await clientRequest.fetch(
        this.getBaseUrl(),
        requestBase
      );

      if (ZError.is(response)) {
        throw ZError.factory(response);
      }

      return response as any;
    };
  }

  private getBaseUrl(): string {
    return this.config?.url ?? window.location.origin;
  }

  public getHandler(procedurePath: string) {
    const handler = this.handlersMap.get(procedurePath);

    if (!handler) {
      throw new ProcedureNotFound(procedurePath);
    }

    return handler;
  }
}
