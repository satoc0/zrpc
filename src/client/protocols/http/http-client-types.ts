import { AcceptPromise } from '../../../core';
import { ClientConfig } from '../../../core/protocols/client-protocol-base';

export interface ZClientHttpConfig extends ClientConfig {
  requestBuilder?: () => AcceptPromise<RequestInit>;
}
