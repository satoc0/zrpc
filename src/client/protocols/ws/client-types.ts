import { ClientConfig } from '../../../core/protocols/client-protocol-base';

export interface ClientWSConfig extends ClientConfig {
  /**
   * Time in milliseconds of response to timeout.
   *
   * @default 30000
   */
  responseTimeout?: number;

  /**
   * Time in milliseconds of connection to timeout.
   *
   * @default 5000
   */
  connectionTimeout?: number;

  /**
   * Time interval, in milliseconds, between reconnection attempts
   * in case of a connection down for non-explicit reason.
   *
   * @default 30000
   */
  reconnectionTryInterval?: number;

  /**
   * The maximum number of reconnection attempts allowed before giving up.
   *
   * @default Infinity
   */
  reconnectionMaxAttemps?: number;

  /**
   * The interval in milliseconds between each ping sent to check the health of the connection.
   *
   *  @default 3000
   */
  pingInterval?: number;

  /**
   * Maximum time allowed for the client to receive a response from the server after sending a ping message.
   * If the server doesn't respond within this time, the client considers the connection lost and tries to reconnect.
   *
   *  @default 10000
   */
  pingTimeout?: number;
}
