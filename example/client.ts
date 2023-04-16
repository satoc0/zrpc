import { ZHttpClient, ZWSClient } from '../src';
import { api } from './index';

(async () => {
  const httpClient = new ZHttpClient(api, { url: 'http://localhost:3000' });
  const wsClient = new ZWSClient(api, { url: 'http://localhost:3000' });

  wsClient.handle.account.get(async (input) => {
    return { data: input.name };
  });

  const wtf = await wsClient.call.account.get({ name: '' });

  const response = await httpClient.call.account.get({ name: '2' });

  console.log({ response });

  const response2 = await httpClient.call.getAccount({
    square: 2,
    optional: null,
  });

  // client.handle.account.get(() => {});

  console.log({ r: response2.square });
})();
