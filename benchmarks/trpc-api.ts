/* eslint-disable import/no-extraneous-dependencies */
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { z } from 'zod';
import { AddressInfo } from 'node:net';

export function createServer() {
  const t = initTRPC.create({});

  const router = t.router({
    sum: t.procedure
      .input(
        z.object({
          left: z.number(),
          right: z.number(),
        })
      )
      .query(({ input }) => {
        return { result: input.left + input.right };
      }),
  });

  const server = createHTTPServer({
    router: router,
  });

  server.listen();

  return { router, httpServer: server.server };
}

export const { router, httpServer } = createServer();
export const port = (httpServer.address() as AddressInfo).port;

export const trpcClient = createTRPCProxyClient<typeof router>({
  links: [
    httpBatchLink({
      url: `http://localhost:${port}`,
      headers: { Connection: 'close' },
    }),
  ],
});
