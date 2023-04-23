/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  IncomingMessage,
  Server,
  ServerResponse,
  createServer,
} from 'node:http';
import { Socket } from 'node:net';
import ZRPC, { ZHttpServer } from '../../../../src';
import { ProcedureNotFound } from '../../../../src/core/core-errors';
import { HttpServerConfig } from '../../../../src/server/protocols/http/types';
import { BodyReadError } from '../../../../src/server/protocols/http/errors';

describe('server', () => {
  const api = new ZRPC({
    procedures: {
      procedureMock: {
        input: { value: 'string' },
        output: { value: 'string' },
      },
    },
  });

  it('should create server instance', () => {
    const server = new ZHttpServer(api);

    expect(server).toBeDefined();
    expect(Object.keys(server.handle)).toHaveLength(1);
    expect(server.handle.procedureMock).toBeInstanceOf(Function);
  });

  it('should attach to server', () => {
    const serverMock = {
      addListener: jest.fn(),
    };
    const server = new ZHttpServer(api);

    server.attach(serverMock as unknown as Server);

    expect(serverMock.addListener).toBeCalled();
    expect(serverMock.addListener.mock.calls[0][0]).toBe('request');
    expect(serverMock.addListener.mock.calls[0][1]).toBeInstanceOf(Function);
  });

  it('should listen request', async () => {
    const httpServer = createServer();

    const zserver = new ZHttpServer(api);

    zserver.handle.procedureMock((ctx) => {
      return { value: `output_${ctx.input}` };
    });

    zserver.attach(httpServer);

    const requestHandlerSpy = jest.spyOn(zserver, 'requestHandler' as any);

    const socket = new Socket();
    const mockReq = new IncomingMessage(socket);
    mockReq.url = '/mockUrl';
    const serverResponse = new ServerResponse(mockReq);

    httpServer.emit('request', mockReq, serverResponse);
    expect(requestHandlerSpy).toBeCalledWith(mockReq, serverResponse);
  });

  it('should throw not found procedure', async () => {
    const httpServer = createServer();

    const zserver = new ZHttpServer(api);

    zserver.handle.procedureMock((ctx) => {
      return { value: `output_${ctx.input}` };
    });

    zserver.attach(httpServer);

    const socket = new Socket();
    const mockReq = new IncomingMessage(socket);
    mockReq.url = '/nonExistent';
    const serverResponse = new ServerResponse(mockReq);

    const serverEndSpy = jest.spyOn(serverResponse, 'end');

    const spyOnProcedureHandlerMapGet = jest.spyOn(
      (zserver as any).builder,
      'get'
    );

    const expectedError = new ProcedureNotFound('nonExistent');

    httpServer.emit('request', mockReq, serverResponse);

    expect(spyOnProcedureHandlerMapGet.mock.results[0].type).toBe('throw');
    expect(spyOnProcedureHandlerMapGet.mock.results[0].value).toEqual(
      expectedError
    );
    expect(serverEndSpy).toBeCalledWith(
      expectedError.getResponseBuffer(),
      'binary'
    );
  });

  it('should throw body read error', async () => {
    const httpServer = createServer();

    const zserver = new ZHttpServer(api);

    zserver.handle.procedureMock((ctx) => {
      return { value: `output_${ctx.input}` };
    });

    zserver.attach(httpServer);

    const socket = new Socket();
    const mockReq = new IncomingMessage(socket);
    mockReq.url = '/procedureMock';
    const serverResponse = new ServerResponse(mockReq);

    const serverEndSpy = jest.spyOn(serverResponse, 'end');

    const expectedError = new BodyReadError(
      'procedureMock',
      `Error: bodyErrorMock`
    );

    httpServer.emit('request', mockReq, serverResponse);

    process.nextTick(() => {
      mockReq.emit('error', new Error('bodyErrorMock'));
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(serverEndSpy).toBeCalledWith(
      expectedError.getResponseBuffer(),
      'binary'
    );
  });

  it('should run middlewares', async () => {
    const httpServer = createServer();
    const config: HttpServerConfig = {
      middlewares: [jest.fn(() => {}), jest.fn(() => {}), jest.fn(() => {})],
    };
    const middlewares = config.middlewares as any;

    const zserver = new ZHttpServer(api, config);

    const serializer = api.proceduresDataParsers.get('procedureMock');

    const inputDataBuffer = serializer.input.encode({ value: 'input_string' });
    const outputDataBuffer = serializer.output.encode({
      value: `output_input_string`,
    });

    zserver.handle.procedureMock((ctx) => {
      return { value: `output_${ctx.input.value}` };
    });

    zserver.attach(httpServer);

    const socket = new Socket();
    const mockReq = new IncomingMessage(socket);

    mockReq.url = '/procedureMock';

    const serverResponse = new ServerResponse(mockReq);

    const serverEndSpy = jest.spyOn(serverResponse, 'end');

    mockReq.push(inputDataBuffer);
    mockReq.complete = true;

    httpServer.emit('request', mockReq, serverResponse);
    await new Promise((r) => setTimeout(r, 50));

    expect(serverEndSpy).toBeCalledWith(outputDataBuffer, 'binary');
    expect(middlewares[0]).toBeCalledWith(mockReq, serverResponse);
    expect(middlewares[1]).toBeCalledWith(mockReq, serverResponse);
    expect(middlewares[2]).toBeCalledWith(mockReq, serverResponse);
  });
});
