import { createServer as createHttpServer } from 'node:http';
import ZRPC, { ZClient, ZServer } from '../src';
import { AddressInfo } from 'node:net';

export function createServer() {
  const api = new ZRPC({
    procedures: {
      sum: {
        input: {
          left: 'int32',
          right: 'int32',
        },
        output: {
          result: 'int32',
        },
      },
    },
  });

  const server = new ZServer(api);

  server.api.sum(({ input: { left, right } }) => {
    return { result: left + right };
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
