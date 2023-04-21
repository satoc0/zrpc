import { ZRPC } from '../../../zrpc';
import { WSServerClientCallerBuilder } from './client-caller-builder';
import { WSServerClientHandlerBuilder } from './client-handler-builder';

export class WsClient<ZAPI extends ZRPC> {
  constructor(
    private clientId: string,
    private caller: WSServerClientCallerBuilder<ZAPI>,
    private handler: WSServerClientHandlerBuilder<ZAPI>
  ) {}

  get handle() {
    return this.handler.methods;
  }

  get call() {
    return this.caller.methods;
  }
}
