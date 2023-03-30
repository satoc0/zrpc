import { ZClient } from '../src';
import { api } from './index';

(async () => {
  const client = new ZClient(api, { url: 'http://localhost:3000' });

  const response = await client.exec('GetAccountCommand', { name: '2' });

  console.log({ response });

  const response2 = await client.exec('getAccount', {
    square: 2,
    optional: null,
  });

  console.log({ r: response2.square });
})();
