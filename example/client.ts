import { ZClient } from '../src';
import { api } from './index';

(async () => {
  const client = new ZClient(api, { url: 'http://localhost:3000' });

  client.api.account.update({ name: '2' });

  const response = await client.api.account.get({ name: '2' });

  console.log({ response });

  const response2 = await client.api.getAccount({
    square: 2,
    optional: null,
  });

  console.log({ r: response2.square });
})();
