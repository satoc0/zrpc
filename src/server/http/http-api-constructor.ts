import {
  AcceptPromise,
  ApiProceduresMap,
  ApiProceduresSchemas,
  SchemaDefToType,
} from '../../core';
import { ZRPC } from '../../zrpc';
import { ServerApiConstructor } from '../server-api-constructor';
import { HttpContext } from './http-context';

type HandlerSetter<
  Schema extends ApiProceduresSchemas,
  CTX = HttpContext<SchemaDefToType<Schema['input']>>
> = (
  handler: (ctx: CTX) => AcceptPromise<SchemaDefToType<Schema['output']>>
) => void;

export type ApiConstructorMap<
  Root extends ApiProceduresMap = ApiProceduresMap
> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? HandlerSetter<Root[Key]>
    : Root[Key] extends ApiProceduresMap
    ? ApiConstructorMap<Root[Key]>
    : never;
};

export class HttpServerApiConstructor<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> extends ServerApiConstructor<ZAPI, ApiConstructorMap<Procedures>> {}
