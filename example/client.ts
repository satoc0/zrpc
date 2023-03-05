import { api } from './index';

(async () => {
  const client = await api.client({ url: '' });

  const response = await client.exec('GetAccountCommand', { name: 'foo' });

  console.log({ response });
})();
