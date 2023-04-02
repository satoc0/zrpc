import { Server } from 'node:http';
import ZRPC, { ZClient, ZServer } from '../src';
import { AddressInfo } from 'node:net';

export const api = new ZRPC({
  procedures: {
    sum: {
      input: {
        left: 'int32',
        right: 'int32',
      },
      output: {
        result: 'int64',
      },
    },
  },
});

const zServerPort = 3001;
new ZServer(api);
const httpServer = new Server();

httpServer.listen(zServerPort, async () => {});

const addr = httpServer.address() as AddressInfo;
const serverPort = addr.port;

export const zrpcClient = new ZClient(api, {
  url: `http://localhost:${serverPort}`,
  requestBuilder: () => {
    return {
      headers: [['Connection', 'close']],
    };
  },
});
