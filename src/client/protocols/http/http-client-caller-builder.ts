import {
  ApiProceduresMap,
  ApiProceduresSchemas,
} from '../../../core/api-definition';
import {
  ApiBuilderBase,
  MethodBuilderReturn,
} from '../../../core/builder/api-builder-base';
import { ZError } from '../../../core/core-errors';
import { SchemaToType } from '../../../core/schema-types';
import { ZRPC } from '../../../zrpc';
import { HttpClientRequest } from './http-client-request';
import { ClientHttpConfig } from './http-client-types';

export type ApiBuilderMap<Root extends ApiProceduresMap = ApiProceduresMap> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? (
        input: SchemaToType<Root[Key]['input']>
      ) => Promise<SchemaToType<Root[Key]['output']>>
    : Root[Key] extends ApiProceduresMap
    ? ApiBuilderMap<Root[Key]>
    : never;
};

export class HttpClientCallerBuilder<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> extends ApiBuilderBase<ApiBuilderMap<Procedures>> {
  constructor(protected api: ZAPI, private config: ClientHttpConfig) {
    super(api);
  }

  protected methodFactory(
    procedurePath: string
  ): MethodBuilderReturn<any, Promise<any>> {
    return async (input) => {
      const procedureData = this.api.proceduresDataParsers.get(procedurePath);

      const clientRequest = new HttpClientRequest(procedureData, input);

      const requestBase: RequestInit = this.config?.requestBuilder
        ? await this.config.requestBuilder()
        : {};

      const response = await clientRequest.fetch(
        this.config.url as string,
        requestBase
      );

      if (ZError.is(response)) {
        throw ZError.factory(response);
      }

      return response as any;
    };
  }
}
