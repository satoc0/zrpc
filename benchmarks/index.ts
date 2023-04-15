/* eslint-disable import/no-extraneous-dependencies */
import { httpServer as tHttpServer, trpcClient } from './trpc-api';
import { httpServer as zHttpServer, zrpcClient } from './zrpc-api';

async function runTest(name: string, iterations: number, fn: any) {
  let i = 0;
  console.time(name);
  while (i < iterations) {
    await fn();

    ++i;
  }
  console.timeEnd(name);
}

(async () => {
  const times = 100;
  console.log('Simple schema ' + times + 'x ');
  await runTest('trpc', times, async () => {
    await trpcClient.simple.query({ left: 5, right: 5 });
  });

  await runTest('zrpc', times, async () => {
    await zrpcClient.call.simple({ left: 5, right: 5 });
  });

  console.log('');
  console.log('Complex schema ' + times + 'x ');
  const input = {
    str: 'string',
    num: 123,
    nested1: {
      str: 'string',
      num: 456,
      nested2: {
        str: 'string',
        num: 789,
        nested3: {
          str: 'string',
          num: 123,
        },
      },
    },
  };
  await runTest('trpc', 100, async () => {
    await trpcClient.complex.query(input);
  });

  await runTest('zrpc', 100, async () => {
    await zrpcClient.call.complex(input);
  });

  zHttpServer.close();
  tHttpServer.close();
  process.exit(0);
})();
