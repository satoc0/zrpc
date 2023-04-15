import { ApiBuilderBase } from '../core/api-builder-base';
import { ApiProceduresMap, ApiProceduresSchemas } from '../core/api-definition';
import { SchemaDefToType } from '../core/schema-types';
import { ZRPC } from '../zrpc';
import { ClientConfig } from './client.types';

export type ApiBuilderMap<Root extends ApiProceduresMap = ApiProceduresMap> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? (
        handler: (
          input: SchemaDefToType<Root[Key]['input']>
        ) => Promise<SchemaDefToType<Root[Key]['output']>>
      ) => void
    : Root[Key] extends ApiProceduresMap
    ? ApiBuilderMap<Root[Key]>
    : never;
};

export class ZClientApiHandlerBuilder<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> extends ApiBuilderBase {
  public readonly methods: ApiBuilderMap<Procedures> =
    {} as ApiBuilderMap<Procedures>;

  private handlers: Map<string, any> = new Map();

  constructor(protected def: ZAPI, private config?: ClientConfig) {
    super();
    this.makeBuilder(this.methods, this.def.apiDefinition.procedures);
  }

  protected methodBuilder(
    procedurePath: string
  ): (handler: any) => Promise<any> {
    return async (handler) => {
      this.handlers.set(procedurePath, handler);
      this.initiateWebSocketConnection();
    };
  }

  private initiateWebSocketConnection() {
    // TODO
  }

  private getBaseUrl(): string {
    return this.config?.url ?? window.location.origin;
  }
}
