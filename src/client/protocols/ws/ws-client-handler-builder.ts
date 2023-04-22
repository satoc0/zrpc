import {
  ProceduresTree,
  ProceduresSchemas,
} from '../../../core/api-definition';
import { ApiBuilderBase } from '../../../core/builder/api-builder-base';
import { SchemaToType } from '../../../core/schema-types';
import { ZRPC } from '../../../zrpc';
import { ZSocket } from './socket/socket';
import { ClientWSConfig } from './ws-client-types';

export type ApiBuilderMap<Root extends ProceduresTree = ProceduresTree> = {
  [Key in keyof Root]: Root[Key] extends ProceduresSchemas
    ? (
        handler: (
          input: SchemaToType<Root[Key]['input']>
        ) => Promise<SchemaToType<Root[Key]['output']>>
      ) => void
    : Root[Key] extends ProceduresTree
    ? ApiBuilderMap<Root[Key]>
    : never;
};

export class WsClientHandlerBuilder<ZAPI extends ZRPC> extends ApiBuilderBase<
  ApiBuilderMap<ZAPI['definition']['procedures']>
> {
  constructor(
    protected api: ZAPI,
    private socket: ZSocket,
    private config: ClientWSConfig
  ) {
    super(api);
  }

  protected methodFactory(procedurePath: string): (input: any) => Promise<any> {
    return async (handler) => {
      this.socket.messages.listen(procedurePath, handler);
    };
  }
}
