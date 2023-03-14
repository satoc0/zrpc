import { AcceptPromise } from '../core';

export interface ClientConfig {
  url: string;
  requestBuilder?: () => AcceptPromise<RequestInit>;
}
