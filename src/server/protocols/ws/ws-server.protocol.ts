import type { IncomingMessage, Server } from 'node:http';
import { ApiProceduresMap } from '../../../core/api-definition';
import { ZRPC } from '../../../zrpc';
import { ServerConfig } from '../../server.types';
import { WSServerApiBuilder } from './ws-api-builder';
import { WebSocketServer } from 'ws';
import { AcceptPromise } from '../../../core';
import { ZWSClient } from './ws-client';
import { ZServerProtocolBase } from '../../../core/protocols/server-protocol-base';

export class ZWSServer<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> extends ZServerProtocolBase {
  protected builder!: WSServerApiBuilder<ZAPI, Procedures>;

  public readonly ws = new WebSocketServer({ noServer: true });

  public clients: Set<ZWSClient> = new Set();

  constructor(
    protected def: ZAPI,
    protected config?: ServerConfig<
      (req: IncomingMessage) => AcceptPromise<void>
    >
  ) {
    super();
    this.builder = new WSServerApiBuilder(def);
  }

  get handle() {
    return this.builder.methods;
  }

  public async attach(httpServer: Server) {
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

  protected async runMiddlewares(req: IncomingMessage) {
    if (!this.config || !Array.isArray(this.config.middlewares)) return;

    for (const midde of this.config.middlewares) {
      await midde(req);
    }
  }
}
