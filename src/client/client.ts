// import { ApiProceduresMap } from '../core';
// import { ZRPC } from '../zrpc';
// import { ZHttpClientCallerBuilder as ZClientCallerBuilder } from './protocols/http/http-client-caller-builder';
// import { ZClientApiHandlerBuilder as ZClientHandlerBuilder } from './client-api-handler-builder';
// import { ClientConfig } from './client.types';

// export class ZClient<
//   ZAPI extends ZRPC,
//   Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
// > {
//   protected readonly clientId: string = 'randomGenerated';

//   private caller: ZClientCallerBuilder<ZAPI, Procedures>;

//   private handler: ZClientHandlerBuilder<ZAPI, Procedures>;

//   constructor(private def: ZAPI, private config?: ClientConfig) {
//     this.caller = new ZClientCallerBuilder(this.def, this.config);
//     this.handler = new ZClientHandlerBuilder(this.def, this.config);
//   }

//   get call() {
//     return this.caller.methods;
//   }

//   get handle() {
//     return this.handler.methods;
//   }

//   updateConfig(config: Partial<ClientConfig>) {
//     this.config = { ...this.config, ...config };
//   }
// }
