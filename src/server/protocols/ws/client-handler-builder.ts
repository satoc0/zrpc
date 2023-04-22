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
import {
  ProcedureExecutor,
  ProcedureHandlerFunction,
} from '../../../core/procedures/procedure-executor';
import { ZRPC } from '../../../zrpc';
import { WSContext } from './context';

type HandlerSet<
  Schema extends ProceduresSchemas,
  CTX = WSContext<SchemaToType<Schema['input']>>
> = (
  handler: (ctx: CTX) => AcceptPromise<SchemaToType<Schema['output']>>
) => void;

export type ApiBuilderMap<Root extends ProceduresTree> = {
  [Key in keyof Root]: Root[Key] extends ProceduresSchemas
    ? HandlerSet<Root[Key]>
    : Root[Key] extends ProceduresTree
    ? ApiBuilderMap<Root[Key]>
    : never;
};

export class WSServerClientHandlerBuilder<
  ZAPI extends ZRPC
> extends ApiBuilderBase<ApiBuilderMap<ZAPI['definition']['procedures']>> {
  public handlers: Map<string, ProcedureExecutor<any, any>> = new Map();

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
}
