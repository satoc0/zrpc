import { ZRPC } from '../../../../zrpc';
import { ClientWSConfig } from '../ws-client-types';
import { SocketConnection } from './socket-connection';
import { SocketMessages } from './socket-messages';

export class ZSocket {
  public readonly connection: SocketConnection;

  public readonly messages: SocketMessages;

  constructor(protected api: ZRPC, protected config: Required<ClientWSConfig>) {
    this.connection = new SocketConnection(api, config);
    this.messages = new SocketMessages(api, config, this.connection);
  }

  destroy() {
    this.messages.destroy();
    this.connection.destroy();
  }
}
