import { Context } from '../context-base';

export class WSContext<Input extends object> extends Context<Input> {
  constructor(public readonly client: any, public readonly input: Input) {
    super(input);
  }
}
