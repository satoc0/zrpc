import { ZClient } from '../src';
import { api } from './index';

(async () => {
  const client = new ZClient(api, { url: 'http://localhost:3000' });

  const response = await client.exec('GetAccountCommand', { name: 'foo' });

  console.log({ response });
})();
