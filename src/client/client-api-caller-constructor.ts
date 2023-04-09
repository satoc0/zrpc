import { ApiConstructor } from '../core/api-constructor';
import { ApiProceduresMap, ApiProceduresSchemas } from '../core/api-definition';
import { ZError } from '../core/core-errors';
import { SchemaDefToType } from '../core/schema-types';
import { ZRPC } from '../zrpc';
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

export class ZClientApiCallerConstructor<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> extends ApiConstructor {
  public readonly methods: ApiConstructorMap<Procedures> =
    {} as ApiConstructorMap<Procedures>;

  constructor(protected def: ZAPI, private config?: ClientConfig) {
    super();
    this.buildStructor(this.methods, this.def.apiDefinition.procedures);
  }

  protected methodStructor(
    procedurePath: string
  ): (input: any) => Promise<any> {
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
}
