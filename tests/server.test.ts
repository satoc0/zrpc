import { IncomingMessage, Server, ServerResponse } from 'node:http';
import { AddressInfo, Socket } from 'node:net';
import ZRPC, { ZClient, ZServer } from '../src';
import { PROTOBUF_CONTENT_TYPE } from '../src/core/constants';
import { ProcedureNotFound, ZError } from '../src/core/core-errors';
import { BodyReadError } from '../src/server/server-errors';

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

let client: ZClient<typeof api>;
let server: ZServer<typeof api>;
let httpServer: Server;

beforeEach(async () => {
  server = new ZServer(api);
  httpServer = new Server();

  await new Promise<void>((resolve) =>
    httpServer.listen(undefined, async () => {
      resolve();
    })
  );

  const addr = httpServer.address() as AddressInfo;
  const serverPort = addr.port;

  client = new ZClient(api, {
    url: `http://localhost:${serverPort}`,
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

  httpServer.on('request', (req, res) => server.entry(req, res));

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

  httpServer.on('request', (req, res) => server.entry(req, res));

  const left = randomIntFromInterval(0, 50);
  const right = randomIntFromInterval(0, 50);

  await client.call.BasicAddJSON({ left, right }).catch((e) => {
    expect(e).toBeInstanceOf(ZError);
    expect(e.message).toBe('Error: ' + errorMessage);
    expect(e.errorCode).toBe('procedure-handler');
    expect(e.procedureName).toBe('BasicAddJSON');
  });
});

it('should throw not found procedure handler', async () => {
  const localServer = new ZServer(api);

  const socket = new Socket();
  const mockReq = new IncomingMessage(socket);
  mockReq.url = '/BasicAddJSON';
  const serverResponse = new ServerResponse(mockReq);

  const resSetHeader = jest.fn();
  const resEnd = jest.fn();

  serverResponse.setHeader = resSetHeader;
  serverResponse.end = resEnd;

  const procedureNotFoundError = new ProcedureNotFound('BasicAddJSON');

  await localServer.entry(mockReq, serverResponse);

  expect(resSetHeader.mock.calls).toHaveLength(1);
  expect(resSetHeader.mock.calls[0][0]).toBe('Content-Type');
  expect(resSetHeader.mock.calls[0][1]).toBe(PROTOBUF_CONTENT_TYPE);

  expect(resEnd.mock.calls).toHaveLength(1);
  expect(resEnd.mock.calls[0][0]).toEqual(
    procedureNotFoundError.getResponseBuffer()
  );
});

it('should treat correctly body parser error', async () => {
  const localServer = new ZServer(api);

  localServer.handle.BasicAddJSON(async () => {
    return { result: 1 };
  });

  const socket = new Socket();
  const mockReq = new IncomingMessage(socket);
  mockReq.url = '/BasicAddJSON';
  const serverResponse = new ServerResponse(mockReq);

  const resSetHeader = jest.fn();
  const resEnd = jest.fn();

  serverResponse.setHeader = resSetHeader;
  serverResponse.end = resEnd;

  const reqReadStreamError = new Error('foo');

  process.nextTick(() => {
    mockReq.emit('error', reqReadStreamError);
  });

  const bodyReadErrorError = new BodyReadError(
    'BasicAddJSON',
    `${reqReadStreamError.name}: ${reqReadStreamError.message}`
  );

  await localServer.entry(mockReq, serverResponse);

  expect(resSetHeader.mock.calls).toHaveLength(1);
  expect(resSetHeader.mock.calls[0][0]).toBe('Content-Type');
  expect(resSetHeader.mock.calls[0][1]).toBe(PROTOBUF_CONTENT_TYPE);

  expect(resEnd.mock.calls).toHaveLength(1);
  expect(resEnd.mock.calls[0][0]).toEqual(
    bodyReadErrorError.getResponseBuffer()
  );
});

it('should execute procedure middlewares', async () => {
  const inputStr = 'inputStr';
  const reqMutationStr = 'yes_req_mutation';

  const handler = server.handle.stringOutput.use(({ req }) => {
    (req as any).reqMutationStr = reqMutationStr;
  });

  handler(({ req, input }) => {
    return { str: (req as any).reqMutationStr + input.str };
  });

  httpServer.on('request', (req, res) => server.entry(req, res));

  const response = await client.call.stringOutput({ str: inputStr });

  expect(response.str).toBe(reqMutationStr + inputStr);
});
