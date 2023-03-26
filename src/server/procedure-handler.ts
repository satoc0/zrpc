import { ProcedureHandlerError } from './server-errors';

export class ProcedureHandler {
  constructor(
    private name: string,
    private handler: (data: any) => Promise<object>
  ) {}

  async run(input: object): Promise<object> {
    try {
      const output = await this.handler(input);
      return output;
    } catch (e) {
      const error = e as Error;
      throw new ProcedureHandlerError(this.name, error.name, error.message);
    }
  }
}
