import {
  AcceptPromise,
  ApiProceduresMap,
  ApiProceduresSchemas,
  SchemaToType,
} from '../../../core';
import {
  ApiBuilderBase,
  MethodBuilderReturn,
} from '../../../core/builder/api-builder-base';
import { ZRPC } from '../../../zrpc';
import { WsClient } from './client';
import { SocketHandler } from './socket';

type HandlerSet<Schema extends ApiProceduresSchemas> = (
  input: SchemaToType<Schema['input']>
) => AcceptPromise<SchemaToType<Schema['output']>>;

export type ApiBuilderMap<Root extends ApiProceduresMap = ApiProceduresMap> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? HandlerSet<Root[Key]>
    : Root[Key] extends ApiProceduresMap
    ? ApiBuilderMap<Root[Key]>
    : never;
};

export class WSServerClientCallerBuilder<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> extends ApiBuilderBase<ApiBuilderMap<Procedures>> {
  socket!: SocketHandler;

  constructor(protected api: ZAPI, protected client: WsClient<ZAPI>) {
    super(api);
  }

  protected methodFactory(
    methodPathName: string
  ): MethodBuilderReturn<unknown, unknown> {
    throw new Error('Method not implemented.');
  }

  setSocket(socket: SocketHandler) {
    if (this.socket) {
      this.cleanUpCurrentSocket();
    }

    this.socket = socket;

    this.setupSocket();
  }

  private cleanUpCurrentSocket() {}

  private setupSocket() {}
}
