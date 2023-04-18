import type { IncomingMessage, Server } from 'node:http';
import { WebSocketServer } from 'ws';
import { AcceptPromise } from '../../../core';
import { ZServerProtocolBase } from '../../../core/protocols/server-protocol-base';
import { ZRPC } from '../../../zrpc';
import { ServerConfig } from '../../server.types';
import { WsClient } from './client';
import { SocketHandler } from './socket';
import { WsClientCoordinator } from './client-coordinator';

type OnConnectionHandler<ZAPI extends ZRPC> = (client: WsClient<ZAPI>) => void;

export class ZWSServer<ZAPI extends ZRPC> extends ZServerProtocolBase {
  protected builder: undefined;

  handle: undefined;

  public readonly wss = new WebSocketServer({ noServer: true });

  public clientsCoordinators: Map<string, WsClientCoordinator<ZAPI>> =
    new Map();

  public pingPongIntervalIntervalId!: NodeJS.Timer;

  private onConnectionHandler!: OnConnectionHandler<ZAPI>;

  constructor(
    protected api: ZAPI,
    protected config?: ServerConfig<
      (req: IncomingMessage) => AcceptPromise<void>
    >
  ) {
    super();
  }

  public async attach(httpServer: Server) {
    httpServer.on('upgrade', async (req, socket, head) => {
      await this.runMiddlewares(req);

      const url = new URL(req.url as string);
      const clientId = url.searchParams.get('clientId') as string;

      if (!clientId) {
        socket.destroy(new Error('clientId not specified'));

        return;
      }

      const clientCoordinator = this.getClientCoordinator(clientId);

      this.wss.handleUpgrade(req, socket, head, (webSocketClient) => {
        const zSocket = new SocketHandler(webSocketClient);
        clientCoordinator.setSocket(zSocket);

        this.onConnectionHandler?.(clientCoordinator.getClient());

        this.wss.emit('connection', webSocketClient, req);
      });
    });

    httpServer.on('close', () => {
      this.stopPingPongGame();
    });

    this.initPingPongGame();
  }

  private getClientCoordinator(clientId: string) {
    const client = this.clientsCoordinators.get(clientId);
    if (client) {
      return client;
    }

    return new WsClientCoordinator(this.api, clientId);
  }

  protected async runMiddlewares(req: IncomingMessage) {
    if (!this.config || !Array.isArray(this.config.middlewares)) return;

    for (const middie of this.config.middlewares) {
      await middie(req);
    }
  }

  private initPingPongGame() {
    this.pingPongIntervalIntervalId = setInterval(this.pinger, 30000);
  }

  private stopPingPongGame() {
    clearInterval(this.pingPongIntervalIntervalId);
  }

  private pinger() {
    for (const [, client] of this.clientsCoordinators) {
      client.ping();
    }
  }

  onConnection(handler: OnConnectionHandler<ZAPI>) {
    this.onConnectionHandler = handler;
  }
}
