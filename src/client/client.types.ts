import { AcceptPromise } from '../core';

export interface ClientConfig {
  /**
   * Defaults to window.location.origin
   */
  url?: string;
  requestBuilder?: () => AcceptPromise<RequestInit>;
  getClientId?: () => string;
}
