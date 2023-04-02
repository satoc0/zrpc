import { IncomingMessage, ServerResponse } from 'node:http';
import { SchemaDef, SchemaDefToType } from '../core';
import { ProcedureHandlerError } from './server-errors';
import { MiddlewareHandler } from './server.types';

export class ProcedureHandler<I extends SchemaDef, O extends SchemaDef> {
  constructor(
    private name: string,
    private handler: (data: SchemaDefToType<I>) => Promise<SchemaDefToType<O>>,
    private middlewares: MiddlewareHandler<I>[]
  ) {}

  async run(input: SchemaDefToType<I>): Promise<SchemaDefToType<O>> {
    try {
      const output = await this.handler(input);
      return output as SchemaDefToType<O>;
    } catch (e) {
      const error = e as Error;
      throw new ProcedureHandlerError(this.name, error.name, error.message);
    }
  }

  async runMiddlewares(
    req: IncomingMessage,
    res: ServerResponse,
    inputData: I
  ) {
    if (!Array.isArray(this.middlewares)) return;

    for (const middie of this.middlewares) {
      await middie(req, res, inputData);
    }
  }
}
