import { api } from './index';

(async () => {
  const server = await api.server();
  server.handle('GetAccountCommand', async (_data) => {
    console.log({ _data });

    return { name: '1' };
  });
})();
