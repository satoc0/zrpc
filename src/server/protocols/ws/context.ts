import { Context } from '../../../core/procedures/procedure-executor';

export class WSContext<Input extends object> extends Context<Input> {
  constructor(public readonly input: Input) {
    super(input);
  }
}
