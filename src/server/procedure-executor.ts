import { SchemaDef, SchemaDefToType } from '../core';
import { Context } from './context-base';
import { ProcedureHandlerError } from './server-errors';

export class ProcedureExecutor<I extends SchemaDef, O extends SchemaDef> {
  constructor(
    private name: string,
    private handler: (
      ctx: Context<SchemaDefToType<I>>
    ) => Promise<SchemaDefToType<O>>
  ) {}

  async run(ctx: Context<SchemaDefToType<I>>): Promise<SchemaDefToType<O>> {
    try {
      const output = await this.handler(ctx);
      return output as SchemaDefToType<O>;
    } catch (e) {
      const error = e as Error;
      throw new ProcedureHandlerError(this.name, error.name, error.message);
    }
  }
}
