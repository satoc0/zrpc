import { ApiProceduresMap } from '../core';
import { BiDirectionalNotEnabled } from '../core/core-errors';
import { ZRPC } from '../zrpc';
import { ZClientApiCallerConstructor } from './client-api-caller-constructor';
import { ZClientApiHandlerConstructor } from './client-api-handler-constructor';
import { ClientConfig } from './client.types';

export class ZClient<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> {
  protected readonly clientId: string = 'randomGenerated';

  private caller: ZClientApiCallerConstructor<ZAPI, Procedures>;

  private handler: ZClientApiHandlerConstructor<ZAPI, Procedures>;

  constructor(private def: ZAPI, private config?: ClientConfig) {
    this.caller = new ZClientApiCallerConstructor(this.def, this.config);
    this.handler = new ZClientApiHandlerConstructor(this.def, this.config);
  }

  get call() {
    return this.caller.methods;
  }

  get handle() {
    if (!this.def.apiDefinition.bidirectional) {
      throw new BiDirectionalNotEnabled();
    }

    return this.handler.methods;
  }

  updateConfig(config: Partial<ClientConfig>) {
    this.config = { ...this.config, ...config };
  }
}
