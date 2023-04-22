import {
  ApiProceduresMap,
  ApiProceduresSchemas,
} from '../../../core/api-definition';
import {
  ApiBuilderBase,
  MethodBuilderReturn,
} from '../../../core/builder/api-builder-base';
import { SchemaToType } from '../../../core/schema-types';
import { ZRPC } from '../../../zrpc';
import { ZSocket } from './socket/socket';
import { ClientWSConfig } from './client-types';

export type ApiBuilderMap<Root extends ApiProceduresMap = ApiProceduresMap> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? (
        input: SchemaToType<Root[Key]['input']>
      ) => Promise<SchemaToType<Root[Key]['output']>>
    : Root[Key] extends ApiProceduresMap
    ? ApiBuilderMap<Root[Key]>
    : never;
};

export class WsClientCallerBuilder<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> extends ApiBuilderBase<ApiBuilderMap<Procedures>> {
  constructor(
    protected api: ZAPI,
    private socket: ZSocket,
    private config: ClientWSConfig
  ) {
    super(api);
  }

  protected methodFactory(
    procedurePath: string
  ): MethodBuilderReturn<any, Promise<any>> {
    return (input) => {
      return this.socket.messages.callRemoteProcedure(procedurePath, input);
    };
  }
}
