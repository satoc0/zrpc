import type { IncomingMessage, Server } from 'node:http';
import { WebSocketServer } from 'ws';
import { ZServerProtocolBase } from '../../../core/protocols/server-protocol-base';
import { ZRPC } from '../../../zrpc';
import { WsClient } from './client';
import { ClientCoordinator } from './client-coordinator';
import { ResponseCallbacksMap, WebSocketServerConfig } from './types';

type ClientTopEventHandler<ZAPI extends ZRPC> = (
  client: WsClient<ZAPI>
) => void;

export class ZWSServer<ZAPI extends ZRPC> extends ZServerProtocolBase {
  protected builder: undefined;

  handle: undefined;

  public readonly wss = new WebSocketServer({ noServer: true });

  public clientsCoordinators: Map<string, ClientCoordinator<ZAPI>> = new Map();

  public pingPongIntervalIntervalId!: NodeJS.Timer;

  public rejectCallbacksTimeoutIntervalId!: NodeJS.Timer;

  public onConnection?: ClientTopEventHandler<ZAPI>;

  public onReconnection?: ClientTopEventHandler<ZAPI>;

  public onError?: ClientTopEventHandler<ZAPI>;

  private proceduresCallbacksMap: ResponseCallbacksMap = new Map();

  constructor(
    public readonly api: ZAPI,
    public readonly config: WebSocketServerConfig = {}
  ) {
    super();

    config.callTimeout ||= 10000;
    config.pingInterval ||= 10000;
  }

  public async attach(httpServer: Server) {
    httpServer.on('upgrade', async (req, socket, head) => {
      await this.runMiddlewares(req);

      const searchParams = new URLSearchParams(req.url as string);
      const clientId = searchParams.get('clientId') as string;

      if (!clientId) {
        socket.destroy(new Error('clientId not specified'));

        return;
      }

      const clientCoordinator = this.getClientCoordinator(clientId);

      this.wss.handleUpgrade(req, socket, head, (wsSocket) => {
        clientCoordinator.setSocket(wsSocket);

        this.wss.emit('connection', wsSocket, req);
      });
    });

    httpServer.on('close', () => {
      this.stopPingPongGame();
      this.stopRejectCallsTimeouts();
    });

    this.initPingPongGame();
    this.initRejectCallsTimeouts();
  }

  private getClientCoordinator(clientId: string) {
    const client = this.clientsCoordinators.get(clientId);
    if (client) {
      return client;
    }

    return new ClientCoordinator(clientId, this, this.proceduresCallbacksMap);
  }

  protected async runMiddlewares(req: IncomingMessage) {
    if (!this.config || !Array.isArray(this.config.middlewares)) return;

    for (const middie of this.config.middlewares) {
      await middie(req);
    }
  }

  private initPingPongGame() {
    this.pingPongIntervalIntervalId = setInterval(
      (clientsCoordinators) => {
        for (const [, client] of clientsCoordinators) {
          client.ping();
        }
      },
      this.config.pingInterval,
      this.clientsCoordinators
    );
  }

  private initRejectCallsTimeouts() {
    this.rejectCallbacksTimeoutIntervalId = setInterval(
      (callbacks) => {
        const now = Date.now();
        for (const [, callback] of callbacks) {
          if (callback.expireAt < now) {
            callback.reject.deref()?.(new Error('Response timeout'));
          }
        }
      },
      5000,
      this.proceduresCallbacksMap
    );
  }

  private stopPingPongGame() {
    clearInterval(this.pingPongIntervalIntervalId);
  }

  private stopRejectCallsTimeouts() {
    clearInterval(this.rejectCallbacksTimeoutIntervalId);
  }
}
