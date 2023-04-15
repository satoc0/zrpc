import {
  ApiProceduresMap,
  ApiProceduresSchemas,
} from '../../../core/api-definition';
import { ApiBuilderBase } from '../../../core/builder/api-builder-base';
import { ZError } from '../../../core/core-errors';
import { SchemaToType } from '../../../core/schema-types';
import { ZRPC } from '../../../zrpc';
import { ZHttpClientRequest } from './http-client-request';
import { ZClientHttpConfig } from './http-client-types';

export type ApiBuilderMap<Root extends ApiProceduresMap = ApiProceduresMap> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? (
        input: SchemaToType<Root[Key]['input']>
      ) => Promise<SchemaToType<Root[Key]['output']>>
    : Root[Key] extends ApiProceduresMap
    ? ApiBuilderMap<Root[Key]>
    : never;
};

export class ZHttpClientCallerBuilder<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> extends ApiBuilderBase {
  public readonly methods: ApiBuilderMap<Procedures> =
    {} as ApiBuilderMap<Procedures>;

  constructor(protected def: ZAPI, private config?: ZClientHttpConfig) {
    super();
    this.makeBuilder(this.methods, this.def.apiDefinition.procedures);
  }

  protected methodBuilder(procedurePath: string): (input: any) => Promise<any> {
    return async (input) => {
      const procedureData = this.def.proceduresDataParsers.get(procedurePath);

      const clientRequest = new ZHttpClientRequest(procedureData, input);

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
