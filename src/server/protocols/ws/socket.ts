// eslint-disable-next-line import/no-extraneous-dependencies
import { MessageEvent, WebSocket } from 'ws';
import { ZError } from '../../../core/core-errors';
import {
  PONG_BUFFER,
  PingPongMessage,
  SocketMessage,
  SocketMessageSerializer,
  SocketMessageType,
  isPingOrPongBufferMessage,
} from '../../../core/protocols/socket-messages';
import { ZRPC } from '../../../zrpc';
import { SocketProcedureCaller } from './client-caller-builder';
import { ClientCoordinator } from './client-coordinator';
import { WSContext } from './context';
import { ProcedureWaitingCallback, WebSocketServerConfig } from './types';
import { getCallbackKey } from './utils';

export class SocketHandler<ZAPI extends ZRPC> {
  public isAlive = true;

  constructor(
    public readonly ws: WebSocket,
    public coordinator: ClientCoordinator<ZAPI>,
    public config: Required<WebSocketServerConfig> = coordinator.server
      .config as Required<WebSocketServerConfig>
  ) {
    ws.binaryType = 'arraybuffer';

    this.coordinator.caller.socketProcedureCaller = this.callRemoteProcedure;
    this.registryListeners();
  }

  private registryListeners() {
    this.ws.addEventListener('message', this.socketMessageHandler);
    this.ws.on('pong', this.onPong);
  }

  private unRegistryListeners() {
    this.ws.removeEventListener('message', this.socketMessageHandler);
    this.ws.off('pong', this.onPong);
  }

  public destroy() {
    this.unRegistryListeners();
  }

  private callRemoteProcedure: SocketProcedureCaller = (
    procedureName: string,
    input: any
  ) => {
    return new Promise((resolve, reject) => {
      try {
        const dataParsers =
          this.coordinator.server.api.proceduresDataParsers.get(procedureName);

        const dataBuffer = dataParsers.input.encode(input);

        const callId = this.coordinator.getNewCallId();

        const responseCallbackKey = getCallbackKey(
          this.coordinator.clientId,
          callId
        );

        this.coordinator.proceduresCallbacksMap.set(responseCallbackKey, {
          resolve,
          reject,
          expireAt: Date.now() + this.config.callTimeout,
        });

        this.sendMessage({
          messageType: SocketMessageType.Call,
          callId,
          procedureName,
          dataBuffer,
        });
      } catch (err) {
        reject(err);
      }
    });
  };

  public sendMessage(message: SocketMessage) {
    const messageBuffer = SocketMessageSerializer.encode(message);
    this.sendOrQueue(messageBuffer);
  }

  private sendOrQueue(buffer: Uint8Array) {
    if (this.isAlive) {
      this.ws.send(buffer);
    } else {
      this.coordinator.enqueueMessage(buffer);
    }
  }

  private socketMessageHandler = (message: MessageEvent) => {
    switch (isPingOrPongBufferMessage(message.data as ArrayBuffer)) {
      // For client ping custom implementation
      case PingPongMessage.Ping:
        this.sendPong();
        break;
      case PingPongMessage.Pong:
        break;
      default:
        this.handleProcedureMessage(message.data as ArrayBuffer);
    }
  };

  private handleProcedureMessage(arrBuffer: ArrayBuffer) {
    const buffer = Buffer.from(arrBuffer);
    const message = SocketMessageSerializer.decode(buffer);

    switch (message.messageType) {
      case SocketMessageType.Call:
        this.callProcedureHandler(message);
        break;
      case SocketMessageType.Callback:
        this.executeProcedureCallback(message);
        break;
      case SocketMessageType.CallbackError:
        this.executeProcedureCallbackError(message);
        break;
    }
  }

  public async callProcedureHandler(procedureMessage: SocketMessage) {
    try {
      const procedure = this.coordinator.handler.handlers.get(
        procedureMessage.procedureName
      );

      if (!procedure) {
        // Error handling
        return;
      }

      const dataParser = this.coordinator.server.api.proceduresDataParsers.get(
        procedureMessage.procedureName
      );
      const decodedInput = dataParser.input.decode(procedureMessage.dataBuffer);

      const context = new WSContext(decodedInput);
      const output = await procedure.run(context);

      const outputEncoded = dataParser.output.encode(output);

      this.sendCallback(procedureMessage, outputEncoded);
    } catch (e) {
      procedureMessage.messageType = SocketMessageType.CallbackError;

      if (e instanceof ZError) {
        this.sendCallback(procedureMessage, e.getResponseBuffer());
      } else if (e instanceof Error) {
        const error = new ZError({
          errorCode: '',
          message: e.message,
          procedureName: procedureMessage.procedureName,
        });

        this.sendCallback(procedureMessage, error.getResponseBuffer());
      }
      // TODO emitt error
    }
  }

  public executeProcedureCallback(procedureMessage: SocketMessage) {
    const callback = this.getReponseCallback(procedureMessage);

    try {
      const dataParsers = this.coordinator.server.api.proceduresDataParsers.get(
        procedureMessage.procedureName
      );

      const outputData = dataParsers.output.decode(procedureMessage.dataBuffer);

      callback.resolve?.(outputData);
    } catch (err) {
      callback.reject?.(err as Error);
    } finally {
      this.deleteProcedureCallback(procedureMessage);

      callback.resolve = undefined;
      callback.reject = undefined;
    }
  }

  private getReponseCallback(
    procedureMessage: SocketMessage
  ): ProcedureWaitingCallback {
    const responseCallbackKey = getCallbackKey(
      this.coordinator.clientId,
      procedureMessage.callId
    );
    const callback =
      this.coordinator.proceduresCallbacksMap.get(responseCallbackKey);

    if (!callback) {
      throw new Error(
        `Call response handler not found, procedure: ${procedureMessage.procedureName}, call id: ${procedureMessage.callId}`
      );
    }

    return callback;
  }

  private deleteProcedureCallback(procedureMessage: SocketMessage) {
    const callbackKey = getCallbackKey(
      this.coordinator.clientId,
      procedureMessage.callId
    );
    this.coordinator.proceduresCallbacksMap.delete(callbackKey);
  }

  public executeProcedureCallbackError(procedureMessage: SocketMessage) {
    const callback = this.getReponseCallback(procedureMessage);
    callback.reject?.(ZError.factoryFromBuffer(procedureMessage.dataBuffer));

    callback.resolve = undefined;
    callback.reject = undefined;

    this.deleteProcedureCallback(procedureMessage);
  }

  private sendPong() {
    this.ws.send(PONG_BUFFER);
  }

  private onPong = () => {
    this.isAlive = true;
    this.sendQueuedPackets();
  };

  public ping() {
    if (!this.isAlive) this.ws.terminate();

    this.isAlive = false;
    this.ws.ping();
  }

  public sendCallback(originalMessage: SocketMessage, result: Uint8Array) {
    return this.sendMessage({
      ...originalMessage,
      dataBuffer: result,
    });
  }

  public sendQueuedPackets() {
    for (const bufferQueued of this.coordinator.messagesQueue) {
      this.coordinator.unqueueMessage(bufferQueued);
      this.sendOrQueue(bufferQueued);
    }
  }
}
