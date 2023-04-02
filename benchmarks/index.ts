/* eslint-disable import/no-extraneous-dependencies */
import benchmark from 'benchmark';
import { zrpcClient } from './zrpc-api';
import { trpcClient } from './trpc-api';

const suit = new benchmark.Suite('Request/Response', {
  async: true,
});

suit
  .add('trpc', async () => {
    await trpcClient.sum.query({ left: 5, right: 5 });
  })
  .add('zrpc', async () => {
    await zrpcClient.exec('sum', { left: 5, right: 5 });
  })
  .on('error', (...args: any[]) => {
    console.log({ args });
  })
  .on('cycle', function (event: any) {
    console.log(String(event.target));
  })
  .on('complete', function () {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    console.log('Fastest is ' + this.filter('fastest').map('name'));
    process.exit(0);
  })
  // run async
  .run();
