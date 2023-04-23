/**
 * @jest-environment jsdom
 */
import ZRPC, { ZWSClient } from '../../../../../src';
import { setTimeout } from 'timers/promises';
import { LocalDisconnectionReasons } from '../../../../../src/client/protocols/ws/socket/socket-connection';

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

    expect((zwsClient as any).socket.connection.ws).toBeDefined();
    expect(
      (zwsClient as any).socket.connection.pingsIntervalId
    ).toBeGreaterThan(0);

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
    const connection = (zwsClient as any).socket.connection;

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
    const connection = (zwsClient as any).socket.connection;

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

    const connection = (zwsClient as any).socket.connection;

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
    const connection = (zwsClient as any).socket.connection;

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
    const connection = (zwsClient as any).socket.connection;

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
    const connection = (zwsClient as any).socket.connection;

    const tryReconnectSpy = jest.spyOn(connection, 'tryReconnect');

    expect(connection.ws).toBeUndefined();

    await setTimeout(50);

    expect(tryReconnectSpy).toBeCalledTimes(2);
    expect(onError).toBeCalledWith(
      new Error('Maximum reconnection attempts reached.')
    );

    clearTimeout(connection.reconnectionTimeoutId);
  });

  it('should call pings', async () => {
    const wscMock = getWebSocketClientMock();

    const zwsClient = new ZWSClient(api, {
      pingInterval: 10,
      getWebSocketClient: () => {
        return wscMock.webSocketClientMock as unknown as typeof WebSocket;
      },
    });
    const onError = jest.fn((ev: Event | Error) => ev);
    zwsClient.onError = onError;
    const connection = (zwsClient as any).socket.connection;

    const initPingPongGameSpy = jest.spyOn(connection, 'initPingPongGame');
    const stopPingPongGameSpy = jest.spyOn(connection, 'stopPingPongGame');
    const pingSpy = jest.spyOn(connection, 'ping');

    wscMock.eventsListeners.open[0]();

    expect(initPingPongGameSpy).toBeCalledTimes(1);

    await setTimeout(40);

    expect(pingSpy).toBeCalledTimes(3);

    zwsClient.destroy();

    expect(stopPingPongGameSpy).toBeCalledTimes(1);
  });
});
