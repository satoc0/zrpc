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
import { ZRPC } from '../../../zrpc';
import { WSContext } from './context';

type HandlerSet<
  Schema extends ApiProceduresSchemas,
  CTX = WSContext<SchemaToType<Schema['input']>>
> = (
  handler: (ctx: CTX) => AcceptPromise<SchemaToType<Schema['output']>>
) => void;

export type ApiBuilderMap<Root extends ApiProceduresMap> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? HandlerSet<Root[Key]>
    : Root[Key] extends ApiProceduresMap
    ? ApiBuilderMap<Root[Key]>
    : never;
};

export class WSServerClientHandlerBuilder<
  ZAPI extends ZRPC
> extends ApiBuilderBase<ApiBuilderMap<ZAPI['apiDefinition']['procedures']>> {
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
