import { AcceptPromise } from '../../../core';
import { ClientConfig } from '../../../core/protocols/client-protocol-base';

export interface ClientHttpConfig extends ClientConfig {
  requestBuilder?: () => AcceptPromise<RequestInit>;
}
