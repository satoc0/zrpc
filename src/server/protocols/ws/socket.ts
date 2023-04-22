// eslint-disable-next-line import/no-extraneous-dependencies
import { MessageEvent, WebSocket } from 'ws';
import { ZError } from '../../../core/core-errors';
import {
  PONG_BUFFER,
  PingPongMessage,
  SocketMessage,
  SocketMessageParser,
  SocketMessageType,
  isPingOrPongBufferMessage,
} from '../../../core/protocols/ws/socket-message';
import { ZRPC } from '../../../zrpc';
import { SocketProcedureCaller } from './client-caller-builder';
import { ClientCoordinator } from './client-coordinator';
import { WSContext } from './context';
import {
  ReponseCallbackKey,
  ProcedureWaitingCallback,
  WebSocketServerConfig,
} from './types';

export class SocketHandler<ZAPI extends ZRPC> {
  public isAlive = true;

  constructor(
    public readonly ws: WebSocket,
    public coordinator: ClientCoordinator<ZAPI>,
    public config: Required<WebSocketServerConfig> = coordinator.config as Required<WebSocketServerConfig>
  ) {
    ws.binaryType = 'arraybuffer';

    this.coordinator.caller.socketProcedureCaller = this.callRemoteProcedure;
    this.registryListeners();
  }

  private registryListeners() {
    this.ws.addEventListener('message', this.socketMessageHandler);
    this.ws.on('pong', this.onPong);
  }

  private unregistryListners() {
    this.ws.removeEventListener('message', this.socketMessageHandler);
    this.ws.off('pong', this.onPong);
  }

  private callRemoteProcedure: SocketProcedureCaller = (
    procedureName: string,
    input: any
  ) => {
    return new Promise((resolve, reject) => {
      try {
        const dataParsers =
          this.coordinator.api.proceduresDataParsers.get(procedureName);

        const dataBuffer = dataParsers.input.encode(input);

        const callId = this.coordinator.getNewCallId();

        this.sendMessage({
          messageType: SocketMessageType.Call,
          callId,
          procedureName,
          dataBuffer,
        });

        const responseCallbackKey = this.getResponseCallbackKey(callId);

        this.coordinator.responseCallbacksMap.set(responseCallbackKey, {
          resolve,
          reject,
          expireAt: Date.now() + this.config.callTimeout,
        });
      } catch (err) {
        reject(err);
      }
    });
  };

  private getResponseCallbackKey(callId: number): ReponseCallbackKey {
    return `${this.coordinator.clientId}${callId}`;
  }

  sendMessage(message: SocketMessage) {
    const messageBuffer = SocketMessageParser.encode(message);
    this.sendOrQueue(messageBuffer);
  }

  private sendOrQueue(buffer: Uint8Array) {
    if (this.isAlive) {
      this.ws.send(buffer);
    } else {
      this.coordinator.enqueueMessage(buffer);
    }
  }

  public destroy() {
    this.unregistryListners();
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
    const message = SocketMessageParser.decode(buffer);

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

  async callProcedureHandler(procedureMessage: SocketMessage) {
    try {
      const procedure = this.coordinator.handler.handlers.get(
        procedureMessage.procedureName
      );

      if (!procedure) {
        // Error handling
        return;
      }

      const dataParser = this.coordinator.api.proceduresDataParsers.get(
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

  executeProcedureCallback(procedureMessage: SocketMessage) {
    const awaiter = this.getReponseCallback(procedureMessage);

    try {
      const dataParsers = this.coordinator.api.proceduresDataParsers.get(
        procedureMessage.procedureName
      );

      const outputData = dataParsers.output.decode(procedureMessage.dataBuffer);

      awaiter.resolve(outputData);
    } catch (err) {
      awaiter.reject(err as Error);
    } finally {
      this.deleteProcedureCallback(procedureMessage);
    }
  }

  private getReponseCallback(
    procedureMessage: SocketMessage
  ): ProcedureWaitingCallback {
    const responseCallbackKey = this.getResponseCallbackKey(
      procedureMessage.callId
    );
    const callback =
      this.coordinator.responseCallbacksMap.get(responseCallbackKey);

    if (!callback) {
      throw new Error(
        `Call response handler not found, procedure: ${procedureMessage.procedureName}, call id: ${procedureMessage.callId}`
      );
    }

    return callback;
  }

  private deleteProcedureCallback(procedureMessage: SocketMessage) {
    const callResponseWaiterKey = this.getResponseCallbackKey(
      procedureMessage.callId
    );
    this.coordinator.responseCallbacksMap.delete(callResponseWaiterKey);
  }

  executeProcedureCallbackError(procedureMessage: SocketMessage) {
    const callback = this.getReponseCallback(procedureMessage);
    callback.reject(ZError.factoryFromBuffer(procedureMessage.dataBuffer));
  }

  private sendPong() {
    this.ws.send(PONG_BUFFER);
  }

  private onPong = () => {
    this.isAlive = true;
    this.sendQueuedPackets();
  };

  ping() {
    if (!this.isAlive) this.ws.terminate();

    this.isAlive = false;
    this.ws.ping();
  }

  sendCallback(originalMessage: SocketMessage, result: Uint8Array) {
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
