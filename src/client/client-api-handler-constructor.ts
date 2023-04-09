import { ApiConstructor } from '../core/api-constructor';
import { ApiProceduresMap, ApiProceduresSchemas } from '../core/api-definition';
import { SchemaDefToType } from '../core/schema-types';
import { ZRPC } from '../zrpc';
import { ClientConfig } from './client.types';

export type ApiConstructorMap<
  Root extends ApiProceduresMap = ApiProceduresMap
> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? (
        handler: (
          input: SchemaDefToType<Root[Key]['input']>
        ) => Promise<SchemaDefToType<Root[Key]['output']>>
      ) => void
    : Root[Key] extends ApiProceduresMap
    ? ApiConstructorMap<Root[Key]>
    : never;
};

export class ZClientApiHandlerConstructor<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> extends ApiConstructor {
  public readonly methods: ApiConstructorMap<Procedures> =
    {} as ApiConstructorMap<Procedures>;

  private handlers: Map<string, any> = new Map();

  constructor(protected def: ZAPI, private config?: ClientConfig) {
    super();
    this.buildStructor(this.methods, this.def.apiDefinition.procedures);
  }

  protected methodStructor(
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
