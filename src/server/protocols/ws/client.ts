import { ZRPC } from '../../../zrpc';
import { WSServerClientCallerBuilder } from './client-caller-builder';
import { WSServerClientHandlerBuilder } from './client-handler-builder';

export class WsClient<ZAPI extends ZRPC> {
  protected caller!: WSServerClientCallerBuilder<ZAPI>;

  protected handler!: WSServerClientHandlerBuilder<ZAPI>;

  constructor(private clientId: string) {}

  get handle() {
    return this.handler.methods;
  }

  get call() {
    return this.handle.caller;
  }
}
