/**
 * @jest-environment jsdom
 */
import ZRPC, { ZWSClient } from '../../../../../src';
import { setTimeout } from 'timers/promises';
import {
  LocalDisconnectionReasons,
  MessageEventArrayBuffer,
} from '../../../../../src/client/protocols/ws/socket/socket-connection';
import {
  PONG_BUFFER,
  SocketMessage,
  SocketMessageSerializer,
  SocketMessageType,
} from '../../../../../src/core/protocols/socket-messages-serializer';

describe('websocket-client-socket-connection', () => {
  const api = new ZRPC({
    procedures: {
      procedureMock: {
        input: {
          value: 'string',
        },
        output: {
          value: 'string',
        },
      },
    },
  });

  function getWebSocketClientMock() {
    const eventsListeners: Record<string, any[]> = {
      open: [],
      error: [],
      close: [],
      message: [],
    };

    const addEventListener = jest.fn(
      (event: string, fn: (...args: any[]) => any) => {
        eventsListeners[event].push(fn);
      }
    );
    const removeEventListener = jest.fn(
      (event: string, fn: (...args: any[]) => any) => {
        const indexOf = eventsListeners[event].indexOf(fn);

        eventsListeners[event].splice(indexOf, 1);
      }
    );
    const close = jest.fn(() => {});
    const send = jest.fn((buffer: Buffer) => buffer);

    const webSocketClientMock = jest.fn(() => {
      return {
        addEventListener,
        removeEventListener,
        send,
        close,
      };
    });

    return {
      eventsListeners,
      addEventListener,
      close,
      removeEventListener,
      webSocketClientMock,
      send,
    };
  }

  it('should registry start connection events listeners', () => {
    const wscMock = getWebSocketClientMock();
    new ZWSClient(api, {
      getWebSocketClient: () => {
        return wscMock.webSocketClientMock as unknown as typeof WebSocket;
      },
    });

    expect(wscMock.webSocketClientMock).toBeCalled();

    expect(wscMock.addEventListener.mock.calls[0][0]).toBe('open');
    expect(wscMock.addEventListener.mock.calls[0][1]).toBeInstanceOf(Function);

    expect(wscMock.addEventListener.mock.calls[1][0]).toBe('error');
    expect(wscMock.addEventListener.mock.calls[1][1]).toBeInstanceOf(Function);

    expect(wscMock.addEventListener.mock.calls[2][0]).toBe('close');
    expect(wscMock.addEventListener.mock.calls[2][1]).toBeInstanceOf(Function);

    expect(wscMock.eventsListeners.open.length).toBe(1);
    expect(wscMock.eventsListeners.error.length).toBe(1);
    expect(wscMock.eventsListeners.close.length).toBe(1);
  });

  it('should handle successfull connection', () => {
    const wscMock = getWebSocketClientMock();

    const zwsClient = new ZWSClient(api, {
      getWebSocketClient: () => {
        return wscMock.webSocketClientMock as unknown as typeof WebSocket;
      },
    });

    wscMock.eventsListeners.open[0]();

    expect(wscMock.eventsListeners.open.length).toBe(0);
    expect(wscMock.eventsListeners.error.length).toBe(0);
    expect(wscMock.eventsListeners.close.length).toBe(0);
    expect(wscMock.eventsListeners.message.length).toBe(1);

    expect((zwsClient as any).connection.ws).toBeDefined();
    expect((zwsClient as any).connection.pingsIntervalId).toBeGreaterThan(0);

    zwsClient.destroy();
  });

  it('should handle no explicit connection error', async () => {
    const wscMock = getWebSocketClientMock();

    const zwsClient = new ZWSClient(api, {
      connectionTimeout: 10,
      getWebSocketClient: () => {
        return wscMock.webSocketClientMock as unknown as typeof WebSocket;
      },
    });
    const connection = (zwsClient as any).connection;

    const closeEv = new CloseEvent('unknown', {
      reason: 'network-error-mock',
    });

    const tryReconnectSpy = jest.spyOn(connection, 'tryReconnect');
    const isNotExplicitCloseReasonSpy = jest.spyOn(
      connection,
      'isNotExplicitCloseReason'
    );

    wscMock.eventsListeners.error[0](closeEv);

    expect(isNotExplicitCloseReasonSpy).toBeCalledWith('network-error-mock');
    expect(tryReconnectSpy).toBeCalledTimes(1);
    clearTimeout(connection.reconnectionTimeoutId);
  });

  it('should handle explicit connection error', async () => {
    const wscMock = getWebSocketClientMock();

    const zwsClient = new ZWSClient(api, {
      connectionTimeout: 10,
      getWebSocketClient: () => {
        return wscMock.webSocketClientMock as unknown as typeof WebSocket;
      },
    });
    const connection = (zwsClient as any).connection;

    const closeEv = new CloseEvent('unknown', {
      reason: LocalDisconnectionReasons.Destroyed,
    });

    const tryReconnectSpy = jest.spyOn(connection, 'tryReconnect');
    const isNotExplicitCloseReasonSpy = jest.spyOn(
      connection,
      'isNotExplicitCloseReason'
    );

    wscMock.eventsListeners.error[0](closeEv);

    expect(isNotExplicitCloseReasonSpy).toBeCalledWith(
      LocalDisconnectionReasons.Destroyed
    );
    expect(tryReconnectSpy).toBeCalledTimes(0);
  });

  it('should catch error at connection', async () => {
    const wscMock = getWebSocketClientMock();

    const zwsClient = new ZWSClient(api, {
      connectionTimeout: 10,
      getWebSocketClient: () => {
        return wscMock.webSocketClientMock as unknown as typeof WebSocket;
      },
    });

    const onError = jest.fn((ev: Event | Error) => ev);
    zwsClient.onError = onError;

    const connection = (zwsClient as any).connection;

    const anyEv = new Event('websocket');

    const tryReconnectSpy = jest.spyOn(connection, 'tryReconnect');

    wscMock.eventsListeners.error[0](anyEv);

    expect(tryReconnectSpy).toBeCalledTimes(0);
    expect(onError).toBeCalledWith(anyEv);
  });

  it('should try reconnect', async () => {
    const wscMock = getWebSocketClientMock();

    const zwsClient = new ZWSClient(api, {
      connectionTimeout: 10,
      getWebSocketClient: () => {
        return wscMock.webSocketClientMock as unknown as typeof WebSocket;
      },
    });
    const connection = (zwsClient as any).connection;

    const tryReconnectSpy = jest.spyOn(connection, 'tryReconnect');

    expect(wscMock.eventsListeners.open.length).toBe(1);
    expect(wscMock.eventsListeners.error.length).toBe(1);
    expect(wscMock.eventsListeners.close.length).toBe(1);
    expect(wscMock.eventsListeners.message.length).toBe(0);

    expect(connection.ws).toBeUndefined();
    expect(connection.pingsIntervalId).toBeUndefined();

    await setTimeout(11);

    expect(tryReconnectSpy).toBeCalledTimes(1);

    clearTimeout(connection.reconnectionTimeoutId);
  });

  it('should call onReconnect callback', async () => {
    const wscMock = getWebSocketClientMock();

    const zwsClient = new ZWSClient(api, {
      reconnectionTryInterval: 10,
      getWebSocketClient: () => {
        return wscMock.webSocketClientMock as unknown as typeof WebSocket;
      },
    });
    const connection = (zwsClient as any).connection;

    const onReconnectSpy = jest.spyOn(connection, 'onReconnect');

    expect(connection.ws).toBeUndefined();

    wscMock.eventsListeners.open[0]();

    expect(connection.ws).toBeDefined();

    connection.connect();
    wscMock.eventsListeners.open[0]();

    expect(onReconnectSpy).toHaveBeenCalledTimes(1);

    connection.destroy();
  });

  it('should call erro handler with "maximum reconnection attempts reached"', async () => {
    const wscMock = getWebSocketClientMock();

    const zwsClient = new ZWSClient(api, {
      connectionTimeout: 10,
      reconnectionTryInterval: 10,
      reconnectionMaxAttemps: 2,
      getWebSocketClient: () => {
        return wscMock.webSocketClientMock as unknown as typeof WebSocket;
      },
    });
    const onError = jest.fn((ev: Event | Error) => ev);
    zwsClient.onError = onError;
    const connection = (zwsClient as any).connection;

    const tryReconnectSpy = jest.spyOn(connection, 'tryReconnect');

    expect(connection.ws).toBeUndefined();

    await setTimeout(50);

    expect(tryReconnectSpy).toBeCalledTimes(2);
    expect(onError).toBeCalledWith(
      new Error('Maximum reconnection attempts reached.')
    );

    clearTimeout(connection.reconnectionTimeoutId);
  });

  it('should call ping and receive pongs', async () => {
    const wscMock = getWebSocketClientMock();

    const zwsClient = new ZWSClient(api, {
      pingInterval: 10,
      getWebSocketClient: () => {
        return wscMock.webSocketClientMock as unknown as typeof WebSocket;
      },
    });
    const onError = jest.fn((ev: Event | Error) => ev);
    zwsClient.onError = onError;
    const connection = (zwsClient as any).connection;

    const initPingPongGameSpy = jest.spyOn(connection, 'initPingPongGame');
    const stopPingPongGameSpy = jest.spyOn(connection, 'stopPingPongGame');
    const onPongSpy = jest.spyOn(connection, 'onPong');
    const pingSpy = jest.spyOn(connection, 'ping');

    wscMock.eventsListeners.open[0]();

    expect(initPingPongGameSpy).toBeCalledTimes(1);

    const messageEvent = new MessageEvent('', {
      data: PONG_BUFFER,
    });

    wscMock.eventsListeners.message[0]?.(messageEvent);
    wscMock.eventsListeners.message[0]?.(messageEvent);
    wscMock.eventsListeners.message[0]?.(messageEvent);

    await setTimeout(35);

    expect(pingSpy).toBeCalledTimes(3);
    expect(onPongSpy).toBeCalledTimes(3);

    zwsClient.destroy();

    expect(stopPingPongGameSpy).toBeCalledTimes(1);
  });

  it('should try reconnect on ping timeout', async () => {
    const wscMock = getWebSocketClientMock();

    const zwsClient = new ZWSClient(api, {
      pingInterval: 10,
      pingTimeout: 5,
      getWebSocketClient: () => {
        return wscMock.webSocketClientMock as unknown as typeof WebSocket;
      },
    });

    const onError = jest.fn((ev: Event | Error) => ev);
    zwsClient.onError = onError;
    const connection = (zwsClient as any).connection;
    const initPingPongGameSpy = jest.spyOn(connection, 'initPingPongGame');
    const pingSpy = jest.spyOn(connection, 'ping');

    const tryReconnectSpy = jest.spyOn(connection, 'tryReconnect');
    const cleanUpCurrentConnectionSpy = jest.spyOn(
      connection,
      'cleanUpCurrentConnection'
    );

    wscMock.eventsListeners.open[0]();
    expect(initPingPongGameSpy).toBeCalledTimes(1);

    await setTimeout(20);
    expect(pingSpy).toBeCalledTimes(1);

    expect(tryReconnectSpy).toBeCalledTimes(1);
    expect(cleanUpCurrentConnectionSpy).toBeCalledTimes(1);
    expect(connection.pingTimeoutId).toBeDefined();

    zwsClient.destroy();
  });

  it('should handle procedure message', async () => {
    const wscMock = getWebSocketClientMock();

    const zwsClient = new ZWSClient(api, {
      pingInterval: 60000,
      pingTimeout: 60000,
      getWebSocketClient: () => {
        return wscMock.webSocketClientMock as unknown as typeof WebSocket;
      },
    });

    const connection = (zwsClient as any).connection;

    const procedureMessageHandler = jest.fn(
      (message: MessageEventArrayBuffer) => message
    );
    connection.procedureMessageHandler = procedureMessageHandler;

    wscMock.eventsListeners.open[0]();

    const procedureMessage = SocketMessageSerializer.encode({
      messageType: SocketMessageType.Call,
      callId: 0,
      procedureName: '',
      dataBuffer: Buffer.from(''),
    });

    const messageEvent = new MessageEvent('', {
      data: procedureMessage,
    });

    wscMock.eventsListeners.message[0](messageEvent);

    expect(procedureMessageHandler).toBeCalledWith(messageEvent);

    zwsClient.destroy();
  });

  it('should send socket message', async () => {
    const wscMock = getWebSocketClientMock();

    const zwsClient = new ZWSClient(api, {
      pingInterval: 60000,
      pingTimeout: 60000,
      getWebSocketClient: () => {
        return wscMock.webSocketClientMock as unknown as typeof WebSocket;
      },
    });

    const connection = (zwsClient as any).connection;
    const sendOrQueueSpy = jest.spyOn(
      (zwsClient as any).connection,
      'sendOrQueue'
    );

    wscMock.eventsListeners.open[0]();

    const socketMessage: SocketMessage = {
      messageType: SocketMessageType.Call,
      callId: 0,
      procedureName: '',
      dataBuffer: Buffer.from(''),
    };
    const socketMessageBuffer = SocketMessageSerializer.encode(socketMessage);
    connection.sendPacket(socketMessage);

    expect(sendOrQueueSpy).toHaveBeenCalledWith(socketMessageBuffer);
    expect(wscMock.send).toBeCalledWith(socketMessageBuffer);

    zwsClient.destroy();
  });

  it('should enqueue and send sockets after reconnection', async () => {
    const wscMock = getWebSocketClientMock();

    const zwsClient = new ZWSClient(api, {
      pingInterval: 5,
      pingTimeout: 2,
      reconnectionTryInterval: 5,
      getWebSocketClient: () => {
        return wscMock.webSocketClientMock as unknown as typeof WebSocket;
      },
    });

    const connection = (zwsClient as any).connection;
    const sendOrQueueSpy = jest.spyOn(connection, 'sendOrQueue');
    const queuePacketSpy = jest.spyOn(connection, 'enqueuePacket');
    const tryReconnectSpy = jest.spyOn(connection, 'tryReconnect');
    const connectSpy = jest.spyOn(connection, 'connect');
    wscMock.eventsListeners.open[0]();

    await setTimeout(10);

    expect(tryReconnectSpy).toBeCalledTimes(1);
    const socketMessage: SocketMessage = {
      messageType: SocketMessageType.Call,
      callId: 0,
      procedureName: '',
      dataBuffer: Buffer.from(''),
    };
    const socketMessageBuffer = SocketMessageSerializer.encode(socketMessage);
    connection.sendPacket(socketMessage);

    expect([...connection.packetQueue.values()]).toEqual([socketMessageBuffer]);
    expect(sendOrQueueSpy).toHaveBeenCalledWith(socketMessageBuffer);
    expect(queuePacketSpy).toBeCalledWith(socketMessageBuffer);

    await setTimeout(15);

    expect(connectSpy).toBeCalledTimes(1);
    connection.config = {
      ...connection.config,
      pingInterval: 30000,
      pingTimeout: 30000,
    };

    const onReconnectSpy = jest.spyOn(connection, 'onReconnect');
    const sendQueuedPacketsSpy = jest.spyOn(connection, 'sendQueuedPackets');

    wscMock.eventsListeners.open[0]();

    expect(onReconnectSpy).toBeCalledTimes(1);
    expect(sendQueuedPacketsSpy).toBeCalledTimes(1);

    zwsClient.destroy();
  });
});
