import { IncomingMessage, ServerResponse } from 'http';

const reservedKeys = ['req', 'res', 'input'];

export class ZServerExecutionContext<Input extends object> extends Map {
  constructor(
    public readonly req: IncomingMessage,
    public readonly res: ServerResponse,
    public readonly input: Input
  ) {
    super();
  }

  set(key: string, value: any) {
    if (reservedKeys.includes(key)) {
      throw new Error(
        'You tried to set a reserved keyword in an execution context'
      );
    }

    super.set(key, value);

    return this;
  }
}
