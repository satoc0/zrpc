import {
  AcceptPromise,
  ProceduresTree,
  ProceduresSchemas,
  SchemaToType,
} from '../../../core';
import { ZRPC } from '../../../zrpc';
import { ServerApiBuilder } from '../../server-api-builder';
import { HttpContext } from './context';

type HandlerSetter<
  Schema extends ProceduresSchemas,
  CTX = HttpContext<SchemaToType<Schema['input']>>
> = (
  handler: (ctx: CTX) => AcceptPromise<SchemaToType<Schema['output']>>
) => void;

export type ApiBuilderMap<Root extends ProceduresTree = ProceduresTree> = {
  [Key in keyof Root]: Root[Key] extends ProceduresSchemas
    ? HandlerSetter<Root[Key]>
    : Root[Key] extends ProceduresTree
    ? ApiBuilderMap<Root[Key]>
    : never;
};

export class HttpServerApiBuilder<
  ZAPI extends ZRPC,
  Procedures extends ProceduresTree = ZAPI['definition']['procedures']
> extends ServerApiBuilder<ZAPI, ApiBuilderMap<Procedures>> {}
