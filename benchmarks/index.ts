/* eslint-disable import/no-extraneous-dependencies */
import { httpServer as tHttpServer, trpcClient } from './trpc-api';
import { httpServer as zHttpServer, zrpcClient } from './zrpc-api';

// const reqResSuit = new benchmark.Suite('Request/Response', {
//   async: true,
// });

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
  await runTest('trpc', 100, async () => {
    await trpcClient.sum.query({ left: 5, right: 5 });
  });

  await runTest('zrpc', 100, async () => {
    await zrpcClient.api.sum({ left: 5, right: 5 });
  });

  zHttpServer.close();
  tHttpServer.close();
  process.exit(0);
})();

// console.log({ port });

// reqResSuit
//   // .add(
//   //   'trpc',
//   //   async () => {
//   //     await trpcClient.sum.query({ left: 5, right: 5 });
//   //   },
//   //   { async: true }
//   // )
//   .add(
//     'zrpc',
//     async () => {
//       await zrpcClient.api.sum({ left: 5, right: 5 });
//     },
//     { async: true }
//   )
//   .on('error', (...args: any[]) => {
//     console.log({ args });
//   })
//   .on('cycle', function (event: any) {
//     console.log(String(event.target));
//   })
//   .on('complete', function () {
//     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//     //@ts-ignore
//     console.log('Fastest is ' + this.filter('fastest').map('name'));

//     zHttpServer.close();
//     tHttpServer.close();
//     process.exit(0);
//   });

// (async () => {
//   await setTimeout(2000);
//   const r = await trpcClient.sum.query({ left: 5, right: 5 });
//   console.log({ r });

//   reqResSuit.run();
// })();

// // reqResSuit
// //   .add(
// //     'trpc',
// //     async () => {
// //       await trpcClient.sum.query({ left: 5, right: 5 });
// //     },
// //     { async: true }
// //   )
// //   .add(
// //     'zrpc',
// //     async () => {
// //       await zrpcClient.api.sum({ left: 5, right: 5 });
// //     },
// //     { async: true }
// //   )
// //   .on('error', (...args: any[]) => {
// //     console.log({ args });
// //   })
// //   .on('cycle', function (event: any) {
// //     console.log(String(event.target));
// //   })
// //   .on('complete', function () {
// //     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
// //     //@ts-ignore
// //     console.log('Fastest is ' + this.filter('fastest').map('name'));

// //     zHttpServer.close();
// //     tHttpServer.close();
// //     process.exit(0);
// //   })
// //   // run async
// //   .run();
