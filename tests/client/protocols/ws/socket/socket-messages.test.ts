import { setImmediate } from 'node:timers/promises';
import ZRPC from '../../../../../src';
import { SocketConnection } from '../../../../../src/client/protocols/ws/socket/socket-connection';
import { SocketMessages } from '../../../../../src/client/protocols/ws/socket/socket-messages';
import {
  CallbackHandlerNotFoundError,
  ProcedureNotFoundError,
  ProcedureParserNotFoundError,
  ZError,
} from '../../../../../src/core/core-errors';
import {
  SocketMessage,
  SocketMessageSerializer,
  SocketMessageType,
} from '../../../../../src/core/protocols/socket-messages-serializer';

function noop() {}

describe('socket-messages', () => {
  const api = new ZRPC({
    procedures: {
      procedureMock: {
        input: { value: 'string' },
        output: { value: 'string' },
      },
    },
  });

  it('should set connection message handler', () => {
    const connectionMock: any = {};
    new SocketMessages(api, {}, connectionMock as unknown as SocketConnection);

    expect(connectionMock.procedureMessageHandler).toBeInstanceOf(Function);
  });

  it('should handle correctly socket messages', () => {
    const connectionMock: any = {
      sendPacket: jest.fn(() => {}),
    };
    const socketMessages = new SocketMessages(
      api,
      {},
      connectionMock as unknown as SocketConnection
    );

    socketMessages.onError = jest.fn(() => {});

    const callBuffer = api.proceduresDataParsers
      .get('procedureMock')
      .input.encode({ value: 'callBuffer' });
    const callbackBuffer = api.proceduresDataParsers
      .get('procedureMock')
      .output.encode({ value: 'callbackBuffer' });

    const callMessage: SocketMessage = {
      messageType: SocketMessageType.Call,
      callId: 0,
      procedureName: 'procedureMock',
      dataBuffer: callBuffer,
    };

    const callMessageEventBuffer = SocketMessageSerializer.encode(callMessage);

    const callMessageEvent = new MessageEvent('', {
      data: callMessageEventBuffer,
    });

    const callbackMessage: SocketMessage = {
      messageType: SocketMessageType.Callback,
      callId: 0,
      procedureName: 'procedureMock',
      dataBuffer: callbackBuffer,
    };

    const callbackMessageEventBuffer =
      SocketMessageSerializer.encode(callbackMessage);

    const callbackMessageEvent = new MessageEvent('', {
      data: callbackMessageEventBuffer,
    });

    const handleMessageSpy = jest.spyOn(socketMessages, 'handleMessage' as any);
    const callHandlerSpy = jest.spyOn(socketMessages, 'callHandler' as any);
    const executeCallbackSpy = jest.spyOn(
      socketMessages,
      'executeCallback' as any
    );

    connectionMock.procedureMessageHandler(callMessageEvent);

    expect(handleMessageSpy).toBeCalledWith(callMessageEvent);
    expect(callHandlerSpy).toBeCalledWith(callMessage);

    connectionMock.procedureMessageHandler(callbackMessageEvent);

    expect(handleMessageSpy).toBeCalledWith(callbackMessageEvent);
    expect(executeCallbackSpy).toBeCalledWith(callbackMessage);
    expect(socketMessages.onError).toBeCalledWith(
      new CallbackHandlerNotFoundError('procedureMock', 0)
    );
  });

  it('should reset call ids', () => {
    const connectionMock: any = {
      sendPacket: jest.fn(() => {}),
    };

    const socketMessages = new SocketMessages(
      api,
      {},
      connectionMock as unknown as SocketConnection
    );

    socketMessages.onError = noop;

    const messagesArray: string[] = new Array(255).fill('message');

    for (const message of messagesArray) {
      socketMessages
        .callRemoteProcedure('procedureMock', { value: message })
        .catch(noop);
    }

    expect((socketMessages as any).callId).toBe(0);
  });

  it('should clear all callbacks and handlers on destroy', () => {
    const connectionMock: any = {
      sendPacket: jest.fn(() => {}),
    };

    const socketMessages = new SocketMessages(
      api,
      {
        responseTimeout: 60000,
      },
      connectionMock as unknown as SocketConnection
    );

    socketMessages.onError = noop;

    socketMessages.listen('procedureMock', noop as any);
    expect([...(socketMessages as any).proceduresHandlers.keys()]).toEqual([
      'procedureMock',
    ]);

    const messagesArray: string[] = new Array(10).fill('message');

    for (const message of messagesArray) {
      socketMessages
        .callRemoteProcedure('procedureMock', { value: message })
        .catch(noop);
    }

    expect((socketMessages as any).callbacks.size).toBe(10);

    socketMessages.destroy();

    expect((socketMessages as any).proceduresHandlers.size).toEqual(0);
    expect((socketMessages as any).callbacks.size).toEqual(0);
  });

  describe('callHandler', () => {
    it('should response with ProcedureNotFoundError', () => {
      const connectionMock: any = {
        sendPacket: jest.fn(() => {}),
      };
      new SocketMessages(
        api,
        {},
        connectionMock as unknown as SocketConnection
      );

      const callMessage: SocketMessage = {
        messageType: SocketMessageType.Call,
        callId: 0,
        procedureName: 'inexistentProcedure',
        dataBuffer: Buffer.from(''),
      };

      const callMessageEventBuffer =
        SocketMessageSerializer.encode(callMessage);

      const callMessageEvent = new MessageEvent('', {
        data: callMessageEventBuffer,
      });

      connectionMock.procedureMessageHandler(callMessageEvent);

      const procedureNotFoundBuffer = new ProcedureNotFoundError(
        'inexistentProcedure'
      ).getResponseBuffer();

      expect(connectionMock.sendPacket).toBeCalledWith({
        ...callMessage,
        messageType: SocketMessageType.CallbackError,
        dataBuffer: procedureNotFoundBuffer,
      });
    });

    it('should execute handler correctly', async () => {
      const connectionMock: any = {
        sendPacket: jest.fn(() => {}),
      };
      const socketMessages = new SocketMessages(
        api,
        {},
        connectionMock as unknown as SocketConnection
      );

      const inputDataBuffer = api.proceduresDataParsers
        .get('procedureMock')
        .input.encode({ value: 'input' });

      const callMessage: SocketMessage = {
        messageType: SocketMessageType.Call,
        callId: 0,
        procedureName: 'procedureMock',
        dataBuffer: inputDataBuffer,
      };

      const callMessageEventBuffer =
        SocketMessageSerializer.encode(callMessage);

      const callMessageEvent = new MessageEvent('', {
        data: callMessageEventBuffer,
      });

      const handler = jest.fn(() => {
        return { value: 'output' };
      });

      socketMessages.listen('procedureMock', handler as any);

      connectionMock.procedureMessageHandler(callMessageEvent);

      await setImmediate();

      expect(handler).toBeCalledWith({ value: 'input' });

      const expectedOutputDataBuffer = api.proceduresDataParsers
        .get('procedureMock')
        .output.encode({ value: 'output' });

      expect(connectionMock.sendPacket).toBeCalledWith({
        ...callMessage,
        messageType: SocketMessageType.Callback,
        dataBuffer: expectedOutputDataBuffer,
      });
    });

    it('should response call of error inside handler', async () => {
      const connectionMock: any = {
        sendPacket: jest.fn(() => {}),
      };
      const socketMessages = new SocketMessages(
        api,
        {},
        connectionMock as unknown as SocketConnection
      );

      const inputDataBuffer = api.proceduresDataParsers
        .get('procedureMock')
        .input.encode({ value: 'input' });

      const callMessage: SocketMessage = {
        messageType: SocketMessageType.Call,
        callId: 0,
        procedureName: 'procedureMock',
        dataBuffer: inputDataBuffer,
      };

      const callMessageEventBuffer =
        SocketMessageSerializer.encode(callMessage);

      const callMessageEvent = new MessageEvent('', {
        data: callMessageEventBuffer,
      });

      const handler = jest.fn(() => {
        throw new Error('error inside handler');
      });

      socketMessages.listen('procedureMock', handler as any);

      connectionMock.procedureMessageHandler(callMessageEvent);

      await setImmediate();

      expect(handler).toBeCalledWith({ value: 'input' });

      const zError = new ZError({
        errorCode: '',
        message: 'error inside handler',
        procedureName: 'procedureMock',
      });

      expect(connectionMock.sendPacket).toBeCalledWith({
        ...callMessage,
        messageType: SocketMessageType.CallbackError,
        dataBuffer: zError.getResponseBuffer(),
      });
    });

    it('should response call of ZError', async () => {
      const connectionMock: any = {
        sendPacket: jest.fn(() => {}),
      };
      const socketMessages = new SocketMessages(
        api,
        {},
        connectionMock as unknown as SocketConnection
      );

      const inputDataBuffer = api.proceduresDataParsers
        .get('procedureMock')
        .input.encode({ value: 'input' });

      const callMessage: SocketMessage = {
        messageType: SocketMessageType.Call,
        callId: 0,
        procedureName: 'procedureMock_',
        dataBuffer: inputDataBuffer,
      };

      const callMessageEventBuffer =
        SocketMessageSerializer.encode(callMessage);

      const callMessageEvent = new MessageEvent('', {
        data: callMessageEventBuffer,
      });

      const handler = jest.fn(() => {
        throw new Error('error inside handler');
      });

      socketMessages.listen('procedureMock_', handler as any);

      connectionMock.procedureMessageHandler(callMessageEvent);

      await setImmediate();

      const zError = new ProcedureParserNotFoundError('procedureMock_');

      expect(connectionMock.sendPacket).toBeCalledWith({
        ...callMessage,
        messageType: SocketMessageType.CallbackError,
        dataBuffer: zError.getResponseBuffer(),
      });
    });

    it('should reject with call timeout error', async () => {
      const connectionMock: any = {
        sendPacket: jest.fn(() => {}),
      };
      const socketMessages = new SocketMessages(
        api,
        {
          responseTimeout: 10,
        },
        connectionMock as unknown as SocketConnection
      );

      const inputDataBuffer = api.proceduresDataParsers
        .get('procedureMock')
        .input.encode({ value: 'input' });

      const callMessage: SocketMessage = {
        messageType: SocketMessageType.Call,
        callId: 0,
        procedureName: 'procedureMock_',
        dataBuffer: inputDataBuffer,
      };

      const callMessageEventBuffer =
        SocketMessageSerializer.encode(callMessage);

      const callMessageEvent = new MessageEvent('', {
        data: callMessageEventBuffer,
      });

      const handler = jest.fn(() => {
        throw new Error('error inside handler');
      });

      socketMessages.listen('procedureMock_', handler as any);

      connectionMock.procedureMessageHandler(callMessageEvent);

      await setImmediate();

      const zError = new ProcedureParserNotFoundError('procedureMock_');

      expect(connectionMock.sendPacket).toBeCalledWith({
        ...callMessage,
        messageType: SocketMessageType.CallbackError,
        dataBuffer: zError.getResponseBuffer(),
      });
    });
  });

  describe('callbacks', () => {
    it('should execute callback handler correctly', async () => {
      const connectionMock: any = {
        sendPacket: jest.fn(() => {}),
      };
      const socketMessages = new SocketMessages(
        api,
        {
          responseTimeout: 10000,
        },
        connectionMock as unknown as SocketConnection
      );

      const promise = socketMessages.callRemoteProcedure('procedureMock', {
        value: 'input',
      });

      const executeCallbackSpy = jest.spyOn(
        socketMessages,
        'executeCallback' as any
      );

      promise.catch(() => {});
      const callbackMap = (socketMessages as any).callbacks as Map<string, any>;
      expect([...callbackMap.keys()]).toEqual([0]);
      expect(callbackMap.size).toBe(1);

      const expectedCallId = 0;
      const expectedDataBuffer = api.proceduresDataParsers
        .get('procedureMock')
        .input.encode({ value: 'input' });

      expect(connectionMock.sendPacket).toBeCalledWith({
        messageType: SocketMessageType.Call,
        callId: expectedCallId,
        dataBuffer: expectedDataBuffer,
        procedureName: 'procedureMock',
      });

      const callbackBuffer = api.proceduresDataParsers
        .get('procedureMock')
        .output.encode({ value: 'callbackBuffer' });

      const callbackMessage: SocketMessage = {
        messageType: SocketMessageType.Callback,
        callId: 0,
        procedureName: 'procedureMock',
        dataBuffer: callbackBuffer,
      };

      const callbackMessageEventBuffer =
        SocketMessageSerializer.encode(callbackMessage);

      const callbackMessageEvent = new MessageEvent('', {
        data: callbackMessageEventBuffer,
      });

      promise.then((output) => {
        expect(output).toEqual({ value: 'callbackBuffer' });
      });

      connectionMock.procedureMessageHandler(callbackMessageEvent);

      expect(executeCallbackSpy).toBeCalledWith(callbackMessage);
    });

    it('should throw callback not found', async () => {
      const connectionMock: any = {
        sendPacket: jest.fn(() => {}),
      };
      const socketMessages = new SocketMessages(
        api,
        {
          responseTimeout: 10000,
        },
        connectionMock as unknown as SocketConnection
      );

      socketMessages.onError = jest.fn(() => {});

      const executeCallbackSpy = jest.spyOn(
        socketMessages,
        'executeCallback' as any
      );

      const callbackBuffer = api.proceduresDataParsers
        .get('procedureMock')
        .output.encode({ value: 'callbackBuffer' });

      const callbackMessage: SocketMessage = {
        messageType: SocketMessageType.Callback,
        callId: 0,
        procedureName: 'procedureMock',
        dataBuffer: callbackBuffer,
      };

      const callbackMessageEventBuffer =
        SocketMessageSerializer.encode(callbackMessage);

      const callbackMessageEvent = new MessageEvent('', {
        data: callbackMessageEventBuffer,
      });

      connectionMock.procedureMessageHandler(callbackMessageEvent);

      expect(executeCallbackSpy).toBeCalledWith(callbackMessage);
      expect(socketMessages.onError).toBeCalledWith(
        new CallbackHandlerNotFoundError('procedureMock', 0)
      );
    });

    it('should throw callback response error', async () => {
      const connectionMock: any = {
        sendPacket: jest.fn(() => {}),
      };
      const socketMessages = new SocketMessages(
        api,
        {
          responseTimeout: 10000,
        },
        connectionMock as unknown as SocketConnection
      );

      const executeCallbackErrorkSpy = jest.spyOn(
        socketMessages,
        'executeCallbackError' as any
      );
      const promise = socketMessages.callRemoteProcedure('procedureMock', {
        value: 'input',
      });

      promise.catch((error) => {
        expect(error).toEqual(
          new ZError({
            errorCode: 'any',
            message: 'foo',
            auxData: '',
            procedureName: 'procedureMock',
          })
        );
      });

      const callbackMap = (socketMessages as any).callbacks as Map<string, any>;
      expect([...callbackMap.keys()]).toEqual([0]);
      expect(callbackMap.size).toBe(1);

      const expectedCallId = 0;
      const expectedDataBuffer = api.proceduresDataParsers
        .get('procedureMock')
        .input.encode({ value: 'input' });

      expect(connectionMock.sendPacket).toBeCalledWith({
        messageType: SocketMessageType.Call,
        callId: expectedCallId,
        dataBuffer: expectedDataBuffer,
        procedureName: 'procedureMock',
      });

      const zErrorBuffer = new ZError({
        errorCode: 'any',
        message: 'foo',
        auxData: '',
        procedureName: 'procedureMock',
      });

      const callbackErrorMessage: SocketMessage = {
        messageType: SocketMessageType.CallbackError,
        callId: 0,
        procedureName: 'procedureMock',
        dataBuffer: zErrorBuffer.getResponseBuffer(),
      };

      const callbackErrorMessageEventBuffer =
        SocketMessageSerializer.encode(callbackErrorMessage);

      const callbackErrorMessageEvent = new MessageEvent('', {
        data: callbackErrorMessageEventBuffer,
      });

      connectionMock.procedureMessageHandler(callbackErrorMessageEvent);

      expect(executeCallbackErrorkSpy).toBeCalledWith(callbackErrorMessage);
    });
  });
});
