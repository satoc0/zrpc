import { ApiProceduresMap } from '../core';
import { ZRPC } from '../zrpc';
import { ZClientApiConstructor } from './client-api-constructor';
import { ClientConfig } from './client.types';

export class ZClient<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> {
  private apiConstructor: ZClientApiConstructor<ZAPI, Procedures>;

  constructor(private def: ZAPI, private config?: ClientConfig) {
    this.apiConstructor = new ZClientApiConstructor(this.def, this.config);
  }

  get api() {
    return this.apiConstructor.structor;
  }

  updateConfig(config: Partial<ClientConfig>) {
    this.config = { ...this.config, ...config };
  }
}
