import { ZRPC } from '../src/zrpc';

export const api = new ZRPC({
  bidirectional: true,
  procedures: {
    account: {
      get: {
        input: { name: 'string' },
        output: { data: 'string' },
      },
      update: {
        input: { name: 'string' },
        output: { data: 'string' },
      },
    },
    getAccount: {
      input: {
        square: 'int32',
        optional: 'string?',
      },
      output: {
        square: 'int32',
      },
    },
  },
});
