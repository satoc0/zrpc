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
import {
  ProcedureExecutor,
  ProcedureHandlerFunction,
} from '../../../core/procedures/procedure-executor';
import { SocketMessage } from '../../../core/protocols/ws/socket-message';
import { ZRPC } from '../../../zrpc';
import { WsClient } from './client';
import { WSContext } from './context';
import { SocketHandler } from './socket';

type HandlerSet<
  ZAPI extends ZRPC,
  Schema extends ApiProceduresSchemas,
  CTX = WSContext<ZAPI, SchemaToType<Schema['input']>>
> = (
  handler: (ctx: CTX) => AcceptPromise<SchemaToType<Schema['output']>>
) => void;

export type ApiBuilderMap<
  ZAPI extends ZRPC,
  Root = ZAPI['apiDefinition']['procedures']
> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? HandlerSet<ZAPI, Root[Key]>
    : Root[Key] extends ApiProceduresMap
    ? ApiBuilderMap<ZAPI, Root[Key]>
    : never;
};

export class WSServerClientHandlerBuilder<
  ZAPI extends ZRPC
> extends ApiBuilderBase<ApiBuilderMap<ZAPI>> {
  socket!: SocketHandler;

  private handlers: Map<string, ProcedureExecutor<any, any>> = new Map();

  constructor(protected api: ZAPI, protected client: WsClient<ZAPI>) {
    super(api);
  }

  protected methodFactory(
    methodPathName: string
  ): MethodBuilderReturn<ProcedureHandlerFunction<any, any>, void> {
    return (handler) => {
      this.handlers.set(
        methodPathName,
        new ProcedureExecutor<any, any>(methodPathName as string, handler)
      );
    };
  }

  setSocket(socket: SocketHandler) {
    if (this.socket) {
      this.cleanUpCurrentSocket();
    }

    this.socket = socket;

    this.setupSocket();
  }

  private cleanUpCurrentSocket() {}

  private setupSocket() {
    this.socket.setCallHandler(this.messageHandler);
  }

  private messageHandler = (message: SocketMessage) => {
    const procedure = this.handlers.get(message.procedureName);

    if (!procedure) {
      // Error handling
      return;
    }

    const dataParser = this.api.proceduresDataParsers.get(
      message.procedureName
    );
    const decodedInput = dataParser.input.decode(
      Buffer.from(message.dataBuffer)
    );

    const context = new WSContext(this.client, decodedInput);
    const result = procedure.run(context);
  };
}
