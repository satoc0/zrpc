import { SchemaDef, SchemaDefToType } from '../core';
import { ZServerExecutionContext } from './request-context';
import { ProcedureHandlerFunction } from './server-api-constructor';
import { ProcedureHandlerError } from './server-errors';

export class ProcedureHandlerExecutor<
  I extends SchemaDef,
  O extends SchemaDef
> {
  private handler!: (
    ctx: ZServerExecutionContext<SchemaDefToType<I>>
  ) => Promise<SchemaDefToType<O>>;

  private middlewares!: ProcedureHandlerFunction<SchemaDefToType<I>, O>[];

  constructor(private name: string) {}

  setHandler(
    handler: (
      ctx: ZServerExecutionContext<SchemaDefToType<I>>
    ) => Promise<SchemaDefToType<O>>
  ) {
    this.handler = handler;
  }

  setMiddlewares(
    middlewares: ProcedureHandlerFunction<SchemaDefToType<I>, O>[]
  ) {
    this.middlewares = middlewares;
  }

  async run(
    ctx: ZServerExecutionContext<SchemaDefToType<I>>
  ): Promise<SchemaDefToType<O>> {
    try {
      const output = await this.handler(ctx);
      return output as SchemaDefToType<O>;
    } catch (e) {
      const error = e as Error;
      throw new ProcedureHandlerError(this.name, error.name, error.message);
    }
  }

  async runMiddlewares(ctx: ZServerExecutionContext<SchemaDefToType<I>>) {
    if (!Array.isArray(this.middlewares)) return;

    for (const middie of this.middlewares) {
      await middie(ctx);
    }
  }
}
