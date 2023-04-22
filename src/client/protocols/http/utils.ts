import { FetchClient } from './http-client-types';

export function getFetchClient(): FetchClient {
  if (typeof globalThis !== undefined && globalThis.fetch) {
    return globalThis.fetch;
  }

  if (typeof window !== undefined && window.fetch) {
    return window.fetch;
  }

  throw new Error('Fetch client not found');
}
