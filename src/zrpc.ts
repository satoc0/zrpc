import { ZClient } from './client';
import { ApiDefinition, ApiProceduresMap } from './core/api-definition';
import { ZProceduresDataParsers } from './core/procedure-data';
import { ZServer } from './server';

export class ZRPC<ApiProcedures extends ApiProceduresMap = ApiProceduresMap> {
  public readonly proceduresDataParsers!: ZProceduresDataParsers;

  constructor(public readonly apiDefinition: ApiDefinition<ApiProcedures>) {
    this.proceduresDataParsers = new ZProceduresDataParsers(
      this.apiDefinition.procedures
    );
  }
}

// export const api = new ZRPC({
//   procedures: {
//     account: {
//       get: {
//         input: { name: 'string' },
//         output: { data: 'string' },
//       },
//     },
//     nest1: {
//       nest2: {
//         nest3: {
//           input: { d: 'string' },
//           output: { d: 'string' },
//         },
//         'nest3.3': {
//           input: { d: 'string' },
//           output: { d: 'string' },
//         },
//       },
//     },
//     getAccount: {
//       input: {
//         square: 'int32',
//         optional: 'string?',
//       },
//       output: {
//         square: 'int32',
//       },
//     },
//   },
// });

// const server = new ZServer(api);
// const client = new ZClient(api);

// server.api.account.get(async () => {
//   return { data: 'asd' };
// });

// server.api.getAccount(({ square }) => {
//   return { square: square ^ 2 };
// });

// server.api.nest1.nest2['nest3.3'](() => {
//   return { d: 'd' };
// });
