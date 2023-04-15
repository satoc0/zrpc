import { createServer as createHttpServer } from 'node:http';
import ZRPC, { SchemaDef, ZHttpClient, ZHttpServer } from '../src';
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

  const server = new ZHttpServer(api);

  server.handle.simple(({ input: { left, right } }) => {
    return { result: left + right };
  });

  server.handle.complex(({ input }) => {
    return input;
  });

  const httpServer = createHttpServer();

  server.attach(httpServer);

  httpServer.listen();

  return { api, httpServer };
}

export const { api, httpServer } = createServer();
export const port = (httpServer.address() as AddressInfo).port;

export const zrpcClient = new ZHttpClient(api, {
  url: `http://localhost:${port}`,
  requestBuilder: () => {
    return {
      headers: [['Connection', 'close']],
    };
  },
});
