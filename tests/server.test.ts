import { Server } from 'node:http';
import { api } from './api-setup';

it('should handle command', async () => {
  const server = await api.server();

  server.handle('BasicAdd', async ({ left, right }) => {
    return { result: left + right };
  });

  const httpServer = new Server(server.entry);
  const serverPort = 3000;

  await new Promise<void>((resolve) =>
    httpServer.listen(serverPort, async () => {
      resolve();
    })
  );

  const client = await api.client({ url: `http://localhost:${serverPort}` });

  const left = 1;
  const right = 2;
  const response = await client.exec('BasicAdd', { left, right });

  expect(response.result).toEqual(left + right);
});
