/* eslint-disable import/no-extraneous-dependencies */
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { z } from 'zod';
import { AddressInfo } from 'node:net';

export function createServer() {
  const t = initTRPC.create({});

  const complexSchema = z.object({
    str: z.string(),
    num: z.number(),
    nested1: z.object({
      str: z.string(),
      num: z.number(),
      nested2: z.object({
        str: z.string(),
        num: z.number(),
        nested3: z.object({
          str: z.string(),
          num: z.number(),
        }),
      }),
    }),
  });

  const router = t.router({
    simple: t.procedure
      .input(
        z.object({
          left: z.number(),
          right: z.number(),
        })
      )
      .output(
        z.object({
          result: z.number(),
        })
      )
      .query(({ input }) => {
        return { result: input.left + input.right };
      }),
    complex: t.procedure
      .input(complexSchema)
      .output(complexSchema)
      .query(({ input }) => {
        return input;
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
