import {
  AcceptPromise,
  ProceduresTree,
  ProceduresSchemas,
  SchemaToType,
} from '../../../core';
import {
  ApiBuilderBase,
  MethodBuilderReturn,
} from '../../../core/builder/api-builder-base';
import { ZRPC } from '../../../zrpc';

type HandlerSet<Schema extends ProceduresSchemas> = (
  input: SchemaToType<Schema['input']>
) => AcceptPromise<SchemaToType<Schema['output']>>;

export type ApiBuilderMap<Root extends ProceduresTree = ProceduresTree> = {
  [Key in keyof Root]: Root[Key] extends ProceduresSchemas
    ? HandlerSet<Root[Key]>
    : Root[Key] extends ProceduresTree
    ? ApiBuilderMap<Root[Key]>
    : never;
};

export type SocketProcedureCaller = (
  methodName: string,
  input: any
) => Promise<any>;

export class WSServerClientCallerBuilder<
  ZAPI extends ZRPC
> extends ApiBuilderBase<ApiBuilderMap<ZAPI['definition']['procedures']>> {
  socketProcedureCaller!: SocketProcedureCaller;

  protected methodFactory(
    methodPathName: string
  ): MethodBuilderReturn<unknown, unknown> {
    return (input) => {
      return this.socketProcedureCaller(methodPathName, input);
    };
  }
}
