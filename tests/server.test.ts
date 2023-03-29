import { Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { ZClient, ZServer } from '../src';
import { api } from './api-setup';

function randomIntFromInterval(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

let client: ZClient<any, any>;
let server: ZServer<any, any>;
let httpServer: Server;

beforeEach(async () => {
  server = new ZServer(api);
  httpServer = new Server();

  await new Promise<void>((resolve) =>
    httpServer.listen(undefined, async () => {
      resolve();
    })
  );

  const addr = httpServer.address() as AddressInfo;
  const serverPort = addr.port;

  client = new ZClient(api, { url: `http://localhost:${serverPort}` });
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) =>
    httpServer.close((err) => (err ? reject(err) : resolve()))
  );
});

it('should handle command', async () => {
  server.handle('BasicAddJSON', async ({ left, right }) => {
    return { result: left + right };
  });

  httpServer.on('request', server.entry);

  const left = randomIntFromInterval(0, 50);
  const right = randomIntFromInterval(0, 50);
  const response = await client.exec('BasicAddJSON', { left, right });

  expect(response.result).toEqual(left + right);
});
