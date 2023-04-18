import {
  AcceptPromise,
  ApiProceduresMap,
  ApiProceduresSchemas,
  SchemaToType,
} from '../../../core';
import { ZRPC } from '../../../zrpc';
import { ServerApiBuilder } from '../../server-api-builder';
import { WSContext } from './context';

type HandlerSet<
  ZAPI extends ZRPC,
  Schema extends ApiProceduresSchemas,
  CTX = WSContext<ZAPI, SchemaToType<Schema['input']>>
> = (
  handler: (ctx: CTX) => AcceptPromise<SchemaToType<Schema['output']>>
) => void;

export type ApiBuilderMap<
  ZAPI extends ZRPC,
  Root extends ApiProceduresMap = ApiProceduresMap
> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? HandlerSet<ZAPI, Root[Key]>
    : Root[Key] extends ApiProceduresMap
    ? ApiBuilderMap<ZAPI, Root[Key]>
    : never;
};

export class WSServerApiBuilder<ZAPI extends ZRPC> extends ServerApiBuilder<
  ZAPI,
  ApiBuilderMap<ZAPI, ZAPI['apiDefinition']['procedures']>
> {}
