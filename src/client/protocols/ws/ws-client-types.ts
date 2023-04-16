import { ClientConfig } from '../../../core/protocols/client-protocol-base';

export interface ZClientWSConfig extends ClientConfig {
  pingInterval?: number;
  pingTimeout?: number;
  responseTimeout?: number;
}
