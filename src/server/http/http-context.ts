import { IncomingMessage, ServerResponse } from 'http';
import { Context } from '../context-base';

export class HttpContext<Input extends object> extends Context<Input> {
  constructor(
    public readonly req: IncomingMessage,
    public readonly res: ServerResponse,
    public readonly input: Input
  ) {
    super(input);
  }
}
