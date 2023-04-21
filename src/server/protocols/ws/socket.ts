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
import { WebSocketServerConfig } from './server';
import { ReponseCallbackKey, ProcedureResponseWait } from './types';

export class SocketHandler<ZAPI extends ZRPC> {
  public isAlive = true;

  constructor(
    public readonly ws: WebSocket,
    public coordinator: ClientCoordinator<ZAPI>,
    public config: Required<WebSocketServerConfig> = coordinator.config as Required<WebSocketServerConfig>
  ) {
    ws.binaryType = 'arraybuffer';

    this.coordinator.caller.socketProcedureCaller = this.procedureCaller;
    this.registryListeners();
  }

  private procedureCaller: SocketProcedureCaller = (
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

  private registryListeners() {
    this.ws.addEventListener('message', this.socketMessageHandler);
    this.ws.on('pong', this.onPong);
  }

  private unregistryListners() {
    this.ws.removeEventListener('message', this.socketMessageHandler);
    this.ws.off('pong', this.onPong);
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
      case SocketMessageType.CallReponse:
        this.callProcedureResponse(message);
        break;
      case SocketMessageType.CallReponseError:
        this.callProcedureResponseError(message);
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

      this.sendCallResponse(procedureMessage, outputEncoded);
    } catch (e) {
      procedureMessage.messageType = SocketMessageType.CallReponseError;

      if (e instanceof ZError) {
        this.sendCallResponse(procedureMessage, e.getResponseBuffer());
      } else if (e instanceof Error) {
        const error = new ZError({
          errorCode: '',
          message: e.message,
          procedureName: procedureMessage.procedureName,
        });

        this.sendCallResponse(procedureMessage, error.getResponseBuffer());
      }
      // TODO emitt error
    }
  }

  callProcedureResponse(procedureMessage: SocketMessage) {
    const awaiter = this.getReponseWaiter(procedureMessage);

    try {
      const dataParsers = this.coordinator.api.proceduresDataParsers.get(
        procedureMessage.procedureName
      );

      const outputData = dataParsers.output.decode(procedureMessage.dataBuffer);

      awaiter.resolve(outputData);
    } catch (err) {
      awaiter.reject(err as Error);
    } finally {
      this.deleteReponseWaiter(procedureMessage);
    }
  }

  private getReponseWaiter(
    procedureMessage: SocketMessage
  ): ProcedureResponseWait {
    const callResponseWaiterKey = this.getResponseCallbackKey(
      procedureMessage.callId
    );
    const awaiter = this.coordinator.responseCallbacksMap.get(
      callResponseWaiterKey
    );

    if (!awaiter) {
      throw new Error(
        `Call response handler not found, procedure: ${procedureMessage.procedureName}, call id: ${procedureMessage.callId}`
      );
    }

    return awaiter;
  }

  private deleteReponseWaiter(procedureMessage: SocketMessage) {
    const callResponseWaiterKey = this.getResponseCallbackKey(
      procedureMessage.callId
    );
    this.coordinator.responseCallbacksMap.delete(callResponseWaiterKey);
  }

  callProcedureResponseError(procedureMessage: SocketMessage) {
    const awaiter = this.getReponseWaiter(procedureMessage);
    awaiter.reject(ZError.factoryFromBuffer(procedureMessage.dataBuffer));
  }

  private sendPong() {
    this.ws.send(PONG_BUFFER);
  }

  private onPong = () => {
    this.isAlive = true;
  };

  ping() {
    if (!this.isAlive) this.ws.terminate();

    this.isAlive = false;
    this.ws.ping();
  }

  sendCallResponse(originalMessage: SocketMessage, result: Uint8Array) {
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
