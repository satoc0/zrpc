import { IncomingMessage, ServerResponse } from 'node:http';
import { SchemaDef, SchemaDefToType } from '../core';
import {
  ProcedureHandlerFunction,
  ProcedureParameters,
} from './server-api-constructor';
import { ProcedureHandlerError } from './server-errors';

export class ProcedureHandlerExecutor<
  I extends SchemaDef,
  O extends SchemaDef
> {
  private handler!: (
    params: ProcedureParameters<SchemaDefToType<I>>
  ) => Promise<SchemaDefToType<O>>;

  private middlewares!: ProcedureHandlerFunction<I, O>[];

  constructor(private name: string) {}

  setHandler(
    handler: (
      params: ProcedureParameters<SchemaDefToType<I>>
    ) => Promise<SchemaDefToType<O>>
  ) {
    this.handler = handler;
  }

  setMiddlewares(middlewares: ProcedureHandlerFunction<I, O>[]) {
    this.middlewares = middlewares;
  }

  async run(
    req: IncomingMessage,
    res: ServerResponse,
    input: SchemaDefToType<I>
  ): Promise<SchemaDefToType<O>> {
    try {
      const output = await this.handler({ req, res, input });
      return output as SchemaDefToType<O>;
    } catch (e) {
      const error = e as Error;
      throw new ProcedureHandlerError(this.name, error.name, error.message);
    }
  }

  async runMiddlewares(req: IncomingMessage, res: ServerResponse, input: I) {
    if (!Array.isArray(this.middlewares)) return;

    for (const middie of this.middlewares) {
      await middie({ req, res, input });
    }
  }
}
