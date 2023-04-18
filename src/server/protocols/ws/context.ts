import { Context } from '../../../core/procedures/procedure-executor';
import { ZRPC } from '../../../zrpc';
import { WsClient } from './client';

export class WSContext<
  ZAPI extends ZRPC,
  Input extends object
> extends Context<Input> {
  constructor(
    public readonly client: WsClient<ZAPI>,
    public readonly input: Input
  ) {
    super(input);
  }
}
