import { AcceptPromise } from '../../../core';
import { ClientConfig } from '../../../core/protocols/client-protocol-base';

export type FetchClient = (
  input: URL | RequestInfo,
  init?: RequestInit | undefined
) => Promise<Response>;

export interface ClientHttpConfig extends ClientConfig {
  requestBuilder?: () => AcceptPromise<RequestInit>;
  fetchClient?: FetchClient;
}
