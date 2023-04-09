import { createServer as createHttpServer } from 'node:http';
import ZRPC, { SchemaDef, ZClient, ZServer } from '../src';
import { AddressInfo } from 'node:net';

export function createServer() {
  const complexSchema: SchemaDef = {
    str: 'string',
    num: 'fixed64',
    nested1: {
      str: 'string',
      num: 'fixed64',
      nested2: {
        str: 'string',
        num: 'fixed64',
        nested3: {
          str: 'string',
          num: 'fixed64',
        },
      },
    },
  };

  const api = new ZRPC({
    procedures: {
      simple: {
        input: {
          left: 'int32',
          right: 'int32',
        },
        output: {
          result: 'int32',
        },
      },

      complex: {
        input: complexSchema,
        output: complexSchema,
      },
    },
  });

  const server = new ZServer(api);

  server.handle.simple(({ input: { left, right } }) => {
    return { result: left + right };
  });

  server.handle.complex(({ input }) => {
    return input;
  });

  const httpServer = createHttpServer((req, res) => server.entry(req, res));
  httpServer.listen();

  return { api, httpServer };
}

export const { api, httpServer } = createServer();
export const port = (httpServer.address() as AddressInfo).port;

export const zrpcClient = new ZClient(api, {
  url: `http://localhost:${port}`,
  requestBuilder: () => {
    return {
      headers: [['Connection', 'close']],
    };
  },
});
