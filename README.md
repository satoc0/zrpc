# ZRPC

Another way to make communication between client a server.

ZRPC is inspired by tRPC, but aims to improve the performance of applications by utilizing the protobuf serialization format keeping type safety.

The use of protobuf over JSON offers more efficient serialization in terms of time and size, thats improve the performance of applications and save resources.

**Not production-ready, can have breaking changes over time.**

<br>

- [Install](#install)
- [Usage](#usage)
- [Benchmarks](#benchmark)

<br>

## Install {#install}

```
npm install zrpc
```

<br>

## Usage {#usage}

To get started with ZRPC, you need to define the procedures calls and their schemas, such as "input" and "output"

<br>

### 1. Create the api definition

First you need create the api procedures and schema definitions: `api.ts`

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

const zServer = new ZServer(api);

zServer.handle('getFullName', async (input) => {
  return { fullName: `${input.firstName} ${input.lastName}` }
});

// Create a http server and pass z server entry handle
// you can use it, anywhere
const httpServer = createServer(zServer.entry);

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

const zClient = new ZClient(api, { url: 'http://localhost:3000' });

async function main() {
  const { fullName } = await zClient.exec('getFullName', {
    firstName: 'John',
    lastName: 'Doe',
  });

  console.log({ fullName });
  // John Doe
}
```

## Benchmark {#benchmark}

Because of protobuf serialization and a simplest implementation, ZRPC can be 2 times more fast than tRPC

`npm run benchmark`

```
> zrpc@0.0.0 benchmark
> NODE_OPTIONS=--max-old-space-size=8192 ts-node --p
roject tsconfig.ts-node.json benchmarks/index.ts
trpc x 120,567 ops/sec ±9.25% (50 runs sampled)
zrpc x 349,709 ops/sec ±27.45% (23 runs sampled)
Fastest is zrpc
```

<br>
<br>

# License

ZRPC is distributed under the MIT license. See the LICENSE file for more details.
