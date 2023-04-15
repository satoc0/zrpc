import { ZHttpClient } from '../src';
import { api } from './index';

(async () => {
  const client = new ZHttpClient(api, { url: 'http://localhost:3000' });

  const response = await client.call.account.get({ name: '2' });

  console.log({ response });

  const response2 = await client.call.getAccount({
    square: 2,
    optional: null,
  });

  // client.handle.account.get(() => {});

  console.log({ r: response2.square });
})();
