import {
  ProceduresSchemas,
  ProceduresTree,
} from '../../../core/api-definition';
import {
  ApiBuilderBase,
  MethodBuilderReturn,
} from '../../../core/builder/api-builder-base';
import { SchemaToType } from '../../../core/schema-types';
import { ZRPC } from '../../../zrpc';
import { SocketMessages } from './socket/socket-messages';
import { ClientWSConfig } from './ws-client-types';

export type ApiBuilderMap<Root extends ProceduresTree = ProceduresTree> = {
  [Key in keyof Root]: Root[Key] extends ProceduresSchemas
    ? (
        input: SchemaToType<Root[Key]['input']>
      ) => Promise<SchemaToType<Root[Key]['output']>>
    : Root[Key] extends ProceduresTree
    ? ApiBuilderMap<Root[Key]>
    : never;
};

export class WsClientCallerBuilder<ZAPI extends ZRPC> extends ApiBuilderBase<
  ApiBuilderMap<ZAPI['definition']['procedures']>
> {
  constructor(
    protected api: ZAPI,
    private socketMessages: SocketMessages,
    private config: ClientWSConfig
  ) {
    super(api);
  }

  protected methodFactory(
    procedurePath: string
  ): MethodBuilderReturn<any, Promise<any>> {
    return (input) => {
      return this.socketMessages.callRemoteProcedure(procedurePath, input);
    };
  }
}
