import type { IncomingMessage, Server } from 'node:http';
import { ApiProceduresMap } from '../../../core/api-definition';
import { ZRPC } from '../../../zrpc';
import { ServerConfig } from '../../server.types';
import { WSServerApiBuilder } from './ws-api-builder';
// eslint-disable-next-line import/no-extraneous-dependencies
import { WebSocketServer } from 'ws';
import { AcceptPromise } from '../../../core';
import { ZWSClient } from './ws-client';

export class ZWSServer<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> {
  private apiConstructor!: WSServerApiBuilder<ZAPI, Procedures>;

  public readonly ws = new WebSocketServer({ noServer: true });

  public clients: Set<ZWSClient> = new Set();

  constructor(
    private def: ZAPI,
    private config?: ServerConfig<(req: IncomingMessage) => AcceptPromise<void>>
  ) {
    this.apiConstructor = new WSServerApiBuilder(def);
  }

  get handle() {
    return this.apiConstructor.methods;
  }

  public async entry(httpServer: Server) {
    httpServer.on('upgrade', async (req, socket, head) => {
      await this.runMiddlewares(req);

      this.ws.handleUpgrade(req, socket, head, (client) => {
        this.clients.add(new ZWSClient(client));

        this.ws.emit('connection', client, req);
      });
    });

    this.initClientsHeartbeat();
  }

  private initClientsHeartbeat() {}

  private async runMiddlewares(req: IncomingMessage) {
    if (!this.config || !Array.isArray(this.config.middlewares)) return;

    for (const midde of this.config.middlewares) {
      await midde(req);
    }
  }
}
