<center>
<h1>ZRPC</h1>
Fast, easy and type safety client-server-client communication.

<a href="#install">Install</a> - <a href="#usage">Usage</a> - <a href="#benchmark">Benchmarks</a>

</center>
<br>

ZRPC provides high-performance, bidirectional client-server communication with a focus on simplicity of implementation. Inspired by tRPC, ZRPC utilizes protobuf serialization to achieve high performance, while ensuring type safety is maintained.

**Not production-ready, can have breaking changes over time.** <br>

## Install

```
npm install zrpc
```

## Usage

To get started with ZRPC, you need to define the procedures calls and their schemas, such as "input" and "output"

### 1. Create the api definition `api.ts`

```typescript
import ZRPC from 'zrpc';

export const api = new ZRPC({
  procedures: {
    getFullName: {
      input: {
        firstName: 'string',
        lastName: 'string',
      },
      output: {
        fullName: 'string',
      },
    },
  },
});
```

<br>

### 2. Create server-side handler: `server.ts`

```typescript
import ZRPC from 'zrpc';
import { api } from './api.ts';

const server = new ZServer(api);

server.api.getFullName(async (input) => {
  return { fullName: `${input.firstName} ${input.lastName}` }
});

// Create a http server and pass z server entry handle
// you can use it, anywhere
const httpServer = createServer(server.entry);

const port = process.env.PORT || 3000;

server.listen(port+, () => {
  console.log(`Server listening at: ${port}`)
});
```

<br>

### 3. Create client that make calls to server: `client.ts`

```typescript
import { ZClient } from 'zrpc';
import { api } from './api.ts';

const client = new ZClient(api, { url: 'http://localhost:3000' });

async function main() {
  const { fullName } = await client.api.getFullName({
    firstName: 'John',
    lastName: 'Doe',
  });

  console.log({ fullName });
  // John Doe
}
```

## Benchmark

Because of protobuf serialization and a simplest implementation, ZRPC can be 2 times more fast than tRPC

`npm run benchmark`

```
> zrpc@0.0.0 benchmark
> NODE_OPTIONS=--max-old-space-size=8192 ts-node --project tsconfig.ts-node.json benchmarks/index.ts
trpc x 120,567 ops/sec ±9.25% (50 runs sampled)
zrpc x 349,709 ops/sec ±27.45% (23 runs sampled)
Fastest is zrpc
```

<br>
<br>

# License

ZRPC is distributed under the MIT license. See the LICENSE file for more details.
