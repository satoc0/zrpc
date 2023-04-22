import { ZRPC } from '../../../../zrpc';
import { ClientWSConfig } from '../ws-client-types';
import { SocketConnection } from './socket-connection';
import { SocketMessages } from './socket-messages';

const DEFAULT_RESPONSE_TIMEOUT = 30000;
const DEFAULT_CONNECTION_TIMEOUT = 5000;
const DEFAULT_PING_INTERVAL = 3000;
const DEFAULT_PING_TIMEOUT = 10000;

export class ZSocket {
  public readonly connection: SocketConnection;

  public readonly messages: SocketMessages;

  constructor(protected api: ZRPC, protected config: ClientWSConfig) {
    config.connectionTimeout ??= DEFAULT_CONNECTION_TIMEOUT;
    config.pingInterval ??= DEFAULT_PING_INTERVAL;
    config.pingTimeout ??= DEFAULT_PING_TIMEOUT;
    config.responseTimeout ??= DEFAULT_RESPONSE_TIMEOUT;

    this.connection = new SocketConnection(api, config);
    this.messages = new SocketMessages(api, config, this.connection);
  }

  destroy() {
    this.messages.destroy();
    this.connection.destroy();
  }
}
