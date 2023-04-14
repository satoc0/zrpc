import {
  AcceptPromise,
  ApiProceduresMap,
  ApiProceduresSchemas,
  SchemaDefToType,
} from '../../core';
import { ZRPC } from '../../zrpc';
import { ServerApiConstructor } from '../server-api-constructor';
import { WSContext } from './ws-context';

type HandlerSet<
  Schema extends ApiProceduresSchemas,
  CTX = WSContext<SchemaDefToType<Schema['input']>>
> = (
  handler: (ctx: CTX) => AcceptPromise<SchemaDefToType<Schema['output']>>
) => void;

export type ApiConstructorMap<
  Root extends ApiProceduresMap = ApiProceduresMap
> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? HandlerSet<Root[Key]>
    : Root[Key] extends ApiProceduresMap
    ? ApiConstructorMap<Root[Key]>
    : never;
};

export class WSServerApiConstructor<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> extends ServerApiConstructor<ZAPI, ApiConstructorMap<Procedures>> {}
