import { ApiProceduresMap } from '../core';
import { ZRPC } from '../zrpc';
import { ZClientApiCallerBuilder } from './client-api-caller-builder';
import { ZClientApiHandlerBuilder } from './client-api-handler-builder';
import { ClientConfig } from './client.types';

export class ZClient<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> {
  protected readonly clientId: string = 'randomGenerated';

  private caller: ZClientApiCallerBuilder<ZAPI, Procedures>;

  private handler: ZClientApiHandlerBuilder<ZAPI, Procedures>;

  constructor(private def: ZAPI, private config?: ClientConfig) {
    this.caller = new ZClientApiCallerBuilder(this.def, this.config);
    this.handler = new ZClientApiHandlerBuilder(this.def, this.config);
  }

  get call() {
    return this.caller.methods;
  }

  get handle() {
    return this.handler.methods;
  }

  updateConfig(config: Partial<ClientConfig>) {
    this.config = { ...this.config, ...config };
  }
}
