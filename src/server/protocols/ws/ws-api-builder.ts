import {
  AcceptPromise,
  ApiProceduresMap,
  ApiProceduresSchemas,
  SchemaDefToType,
} from '../../../core';
import { ZRPC } from '../../../zrpc';
import { ServerApiBuilder } from '../../server-api-builder';
import { WSContext } from './ws-context';

type HandlerSet<
  Schema extends ApiProceduresSchemas,
  CTX = WSContext<SchemaDefToType<Schema['input']>>
> = (
  handler: (ctx: CTX) => AcceptPromise<SchemaDefToType<Schema['output']>>
) => void;

export type ApiBuilderMap<Root extends ApiProceduresMap = ApiProceduresMap> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? HandlerSet<Root[Key]>
    : Root[Key] extends ApiProceduresMap
    ? ApiBuilderMap<Root[Key]>
    : never;
};

export class WSServerApiBuilder<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> extends ServerApiBuilder<ZAPI, ApiBuilderMap<Procedures>> {}
