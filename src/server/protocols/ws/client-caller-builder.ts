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

export type SocketProcedureCaller = (
  methodName: string,
  input: any
) => Promise<any>;

export class WSServerClientCallerBuilder<
  ZAPI extends ZRPC
> extends ApiBuilderBase<ApiBuilderMap<ZAPI['apiDefinition']['procedures']>> {
  socketProcedureCaller!: SocketProcedureCaller;

  protected methodFactory(
    methodPathName: string
  ): MethodBuilderReturn<unknown, unknown> {
    return (input) => {
      return this.socketProcedureCaller(methodPathName, input);
    };
  }
}
