import { SchemaDef, SchemaDefToType } from '../core';
import { ProcedureHandlerError } from './server-errors';

export class ProcedureHandler<I extends SchemaDef, O extends SchemaDef> {
  constructor(
    private name: string,
    private handler: (data: SchemaDefToType<I>) => Promise<SchemaDefToType<O>>
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
}
