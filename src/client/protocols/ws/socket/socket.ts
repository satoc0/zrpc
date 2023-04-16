import { ZRPC } from '../../../../zrpc';
import { ZClientWSConfig } from '../ws-client-types';
import { SocketConnection } from './socket-connection';
import { SocketMessages } from './socket-messages';

const DEFAULT_PING_INTERVAL = 30000;
const DEFAULT_PING_TIMEOUT = 30000;
const DEFAULT_RESPONSE_TIMEOUT = 30000;

export class ZSocket {
  private isAlive = false;

  public connection: SocketConnection;

  public messages: SocketMessages;

  constructor(protected api: ZRPC, protected config: ZClientWSConfig) {
    config.pingInterval ??= DEFAULT_PING_INTERVAL;
    config.pingTimeout ??= DEFAULT_PING_TIMEOUT;
    config.responseTimeout ??= DEFAULT_RESPONSE_TIMEOUT;

    this.connection = new SocketConnection(api, config);
    this.messages = new SocketMessages(api, config, this.connection);
  }
}
