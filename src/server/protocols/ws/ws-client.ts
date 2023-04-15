// eslint-disable-next-line import/no-extraneous-dependencies
import { WebSocket } from 'ws';

export class ZWSClient {
  constructor(public readonly wsClient: WebSocket) {}
}
