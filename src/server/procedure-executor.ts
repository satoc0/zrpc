import { SchemaDef, SchemaDefToType } from '../core';
import { Context } from './protocols/context-base';
import { ProcedureHandlerError } from './server-errors';

export class ProcedureExecutor<
  I extends SchemaDef,
  O extends SchemaDef,
  Input extends object = SchemaDefToType<I>,
  Output extends object = SchemaDefToType<O>
> {
  constructor(
    private name: string,
    private handler: (ctx: Context<Input>) => Promise<Output>
  ) {}

  async run(ctx: Context<Input>): Promise<Output> {
    try {
      const output = await this.handler(ctx);
      return output as Output;
    } catch (e) {
      const error = e as Error;
      throw new ProcedureHandlerError(this.name, error.name, error.message);
    }
  }
}
