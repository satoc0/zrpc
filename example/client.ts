import { __api__ } from './index';

(async () => {
  const client = await __api__.client({ url: 'http://localhost:3000' });

  const response = await client.exec('GetAccountCommand', { name: 'foo' });

  console.log({ response });
})();
