/* eslint-disable import/no-extraneous-dependencies */
import { initTRPC } from '@trpc/server';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { z } from 'zod';

const t = initTRPC.create();

const appRouter = t.router({
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

export const trpcClient = createTRPCProxyClient<typeof appRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
    }),
  ],
});
