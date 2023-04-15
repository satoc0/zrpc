import { AcceptPromise, SchemaDef, SchemaToType } from '..';
import { ProcedureHandlerError } from '../../server/server-errors';

export abstract class Context<Input extends object = object> {
  constructor(public readonly input: Input) {}
}

export type ProcedureHandlerFunction<
  Input extends object,
  Output extends object
> = (input: Context<Input>) => AcceptPromise<Output>;

export class ProcedureExecutor<
  I extends SchemaDef,
  O extends SchemaDef,
  Input extends object = SchemaToType<I>,
  Output extends object = SchemaToType<O>
> {
  constructor(
    private name: string,
    private handler: ProcedureHandlerFunction<Input, Output>
  ) {}

  async run(input: Context<Input>): Promise<Output> {
    try {
      const output = await this.handler(input);
      return output as Output;
    } catch (e) {
      const error = e as Error;
      throw new ProcedureHandlerError(this.name, error.name, error.message);
    }
  }
}
