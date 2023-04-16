import { ClientConfig } from '../../../core/protocols/client-protocol-base';

export interface ZClientWSConfig extends ClientConfig {
  pingInterval?: number;
  pingTimeout?: number;
  responseTimeout?: number;
  connectionTimeout?: number;

  /**
   * Time interval, in milliseconds, between reconnection attempts
   * in case of a connection down for non-explicit reason.
   */
  reconnectionTryInterval?: number;

  /**
   * The maximum number of reconnection attempts allowed before giving up.
   */
  reconnectionMaxAttemps?: number;
}
