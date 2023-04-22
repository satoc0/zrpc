import { IncomingMessage, Server, ServerResponse } from 'node:http';
import { AddressInfo, Socket } from 'node:net';
import ZRPC, { ZHttpClient, ZHttpServer } from '../src';
import { PROTOBUF_CONTENT_TYPE } from '../src/core/constants';
import { ProcedureNotFound, ZError } from '../src/core/core-errors';

function randomIntFromInterval(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export const api = new ZRPC({
  procedures: {
    BasicAddJSON: {
      input: {
        left: 'int32',
        right: 'int32',
      },
      output: {
        result: 'int32',
      },
    },
    stringOutput: {
      input: {
        str: 'string',
      },
      output: {
        str: 'string',
      },
    },
  },
});

let client: ZHttpClient<typeof api>;
let server: ZHttpServer<typeof api>;
let httpServer: Server;

beforeEach(async () => {
  server = new ZHttpServer(api);
  httpServer = new Server();

  await new Promise<void>((resolve) =>
    httpServer.listen(undefined, async () => {
      resolve();
    })
  );

  const addr = httpServer.address() as AddressInfo;
  const serverPort = addr.port;

  client = new ZHttpClient(api, {
    url: `http://localhost:${serverPort}/`,
    requestBuilder: () => {
      return {
        headers: [['Connection', 'close']],
      };
    },
  });
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) =>
    httpServer.close((err) => (err ? reject(err) : resolve()))
  );
});

it('should handle procedure', async () => {
  server.handle.BasicAddJSON(async ({ input: { left, right } }) => {
    return { result: left + right };
  });

  server.attach(httpServer);

  const left = randomIntFromInterval(0, 50);
  const right = randomIntFromInterval(0, 50);

  const response = await client.call.BasicAddJSON({ left, right });

  expect(response.result).toEqual(left + right);
  expect(typeof response.result === 'number').toBeTruthy();
});

it('should treat error in procedure handle', async () => {
  const errorMessage = 'Error message';

  server.handle.BasicAddJSON(async () => {
    throw new Error(errorMessage);
  });

  server.attach(httpServer);

  const left = randomIntFromInterval(0, 50);
  const right = randomIntFromInterval(0, 50);

  await client.call.BasicAddJSON({ left, right }).catch((e) => {
    expect(e).toBeInstanceOf(ZError);
    expect(e.message).toBe('Error: ' + errorMessage);
    expect(e.errorCode).toBe('procedure-execution');
    expect(e.procedureName).toBe('BasicAddJSON');
  });
});

it('should throw not found procedure handler', async () => {
  new ZHttpServer(api);

  const socket = new Socket();
  const mockReq = new IncomingMessage(socket);
  mockReq.url = '/BasicAddJSON';
  const serverResponse = new ServerResponse(mockReq);

  const resSetHeader = jest.fn();
  const resEnd = jest.fn();

  serverResponse.setHeader = resSetHeader;
  serverResponse.end = resEnd;

  const procedureNotFoundError = new ProcedureNotFound('BasicAddJSON');

  server.attach(httpServer);

  httpServer.emit('request', mockReq, serverResponse);

  await new Promise((r) => queueMicrotask(r as any));

  expect(resSetHeader.mock.calls).toHaveLength(1);
  expect(resSetHeader.mock.calls[0][0]).toBe('Content-Type');
  expect(resSetHeader.mock.calls[0][1]).toBe(PROTOBUF_CONTENT_TYPE);

  expect(resEnd.mock.calls).toHaveLength(1);
  expect(resEnd.mock.calls[0][0]).toEqual(
    procedureNotFoundError.getResponseBuffer()
  );
});

// it('should treat correctly body parser error', async () => {
//   const localServer = new ZHttpServer(api);

//   localServer.handle.BasicAddJSON(async () => {
//     return { result: 1 };
//   });

//   const socket = new Socket();
//   const mockReq = new IncomingMessage(socket);
//   mockReq.url = '/BasicAddJSON';
//   const serverResponse = new ServerResponse(mockReq);

//   const resSetHeader = jest.fn();
//   const resEnd = jest.fn();

//   serverResponse.setHeader = resSetHeader;
//   serverResponse.end = resEnd;

//   const reqReadStreamError = new Error('foo');

//   process.nextTick(() => {
//     mockReq.emit('error', reqReadStreamError);
//   });

//   const bodyReadErrorError = new BodyReadError(
//     'BasicAddJSON',
//     `${reqReadStreamError.name}: ${reqReadStreamError.message}`
//   );

//   httpServer.emit('request', mockReq, serverResponse);

//   expect(resSetHeader.mock.calls).toHaveLength(1);
//   expect(resSetHeader.mock.calls[0][0]).toBe('Content-Type');
//   expect(resSetHeader.mock.calls[0][1]).toBe(PROTOBUF_CONTENT_TYPE);

//   expect(resEnd.mock.calls).toHaveLength(1);
//   expect(resEnd.mock.calls[0][0]).toEqual(
//     bodyReadErrorError.getResponseBuffer()
//   );

//   // await new Promise((r) => setTimeout(r, 100));
// });
