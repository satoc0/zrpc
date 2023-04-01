import { IncomingMessage, Server, ServerResponse } from 'node:http';
import { AddressInfo, Socket } from 'node:net';
import ZRPC, { Field, Schema, SchemaBase, ZClient, ZServer } from '../src';
import { ProcedureNotFound, ZError } from '../src/core/core-errors';
import { BodyReadError } from '../src/server/server-errors';
import { PROTOBUF_CONTENT_TYPE } from '../src/core/constants';

function randomIntFromInterval(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

@Schema('BasicAddInput')
class BasicAddInput extends SchemaBase<BasicAddInput> {
  @Field('int32')
  left!: number;

  @Field('int32')
  right!: number;
}

@Schema('BasicAddOutput')
class BasicAddOutput extends SchemaBase<BasicAddOutput> {
  @Field('int32')
  result!: number;
}

export const api = new ZRPC({
  procedures: {
    BasicAdd: {
      input: BasicAddInput,
      output: BasicAddOutput,
    },
    BasicAddJSON: {
      input: {
        left: 'int32',
        right: 'int32',
      },
      output: {
        result: 'int32',
      },
    },
  },
});

let client: ZClient<any, any>;
let server: ZServer<any, any>;
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
  server.handle('BasicAddJSON', async ({ left, right }) => {
    return { result: left + right };
  });

  httpServer.on('request', (req, res) => server.entry(req, res));

  const left = randomIntFromInterval(0, 50);
  const right = randomIntFromInterval(0, 50);

  const response = await client.exec('BasicAddJSON', { left, right });

  expect(response.result).toEqual(left + right);
});

it('should treat error in procedure handle', async () => {
  const errorMessage = 'Error message';

  server.handle('BasicAddJSON', async () => {
    throw new Error(errorMessage);
  });

  httpServer.on('request', (req, res) => server.entry(req, res));

  const left = randomIntFromInterval(0, 50);
  const right = randomIntFromInterval(0, 50);

  await client.exec('BasicAddJSON', { left, right }).catch((e) => {
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

  localServer.handle('BasicAddJSON', async () => {
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
