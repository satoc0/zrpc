import {
  AcceptPromise,
  ApiProceduresMap,
  ApiProceduresSchemas,
  SchemaToType,
} from '../../../core';
import { ZRPC } from '../../../zrpc';
import { ServerApiBuilder } from '../../server-api-builder';
import { HttpContext } from './context';

type HandlerSetter<
  Schema extends ApiProceduresSchemas,
  CTX = HttpContext<SchemaToType<Schema['input']>>
> = (
  handler: (ctx: CTX) => AcceptPromise<SchemaToType<Schema['output']>>
) => void;

export type ApiBuilderMap<Root extends ApiProceduresMap = ApiProceduresMap> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? HandlerSetter<Root[Key]>
    : Root[Key] extends ApiProceduresMap
    ? ApiBuilderMap<Root[Key]>
    : never;
};

export class HttpServerApiBuilder<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> extends ServerApiBuilder<ZAPI, ApiBuilderMap<Procedures>> {}
