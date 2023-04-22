import {
  ProceduresTree,
  ProceduresSchemas,
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

export type ApiBuilderMap<Root extends ProceduresTree = ProceduresTree> = {
  [Key in keyof Root]: Root[Key] extends ProceduresSchemas
    ? (
        input: SchemaToType<Root[Key]['input']>
      ) => Promise<SchemaToType<Root[Key]['output']>>
    : Root[Key] extends ProceduresTree
    ? ApiBuilderMap<Root[Key]>
    : never;
};

export class HttpClientCallerBuilder<ZAPI extends ZRPC> extends ApiBuilderBase<
  ApiBuilderMap<ZAPI['definition']['procedures']>
> {
  constructor(protected api: ZAPI, private config: ClientHttpConfig) {
    super(api);
  }

  protected methodFactory(
    procedurePath: string
  ): MethodBuilderReturn<any, Promise<any>> {
    return async (input) => {
      const procedureData = this.api.proceduresDataParsers.get(procedurePath);

      const clientRequest = new HttpClientRequest(
        this.config,
        procedureData,
        input
      );

      const requestBase: RequestInit = this.config?.requestBuilder
        ? await this.config.requestBuilder()
        : {};

      const response = await clientRequest.fetch(requestBase);

      if (ZError.is(response)) {
        throw ZError.factory(response);
      }

      return response as any;
    };
  }
}
