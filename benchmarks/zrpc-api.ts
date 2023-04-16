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

  const httpServer = new ZHttpServer(api);

  httpServer.handle.simple(({ input: { left, right } }) => {
    return { result: left + right };
  });

  httpServer.handle.complex(({ input }) => {
    return input;
  });

  const zHttpServer = createHttpServer();

  httpServer.attach(zHttpServer);

  zHttpServer.listen();

  return { api, zHttpServer };
}

export const { api, zHttpServer } = createServer();
export const port = (zHttpServer.address() as AddressInfo).port;

export const zrpcHttpClient = new ZHttpClient(api, {
  url: `http://localhost:${port}`,
  requestBuilder: () => {
    return {
      headers: [['Connection', 'close']],
    };
  },
});
