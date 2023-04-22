import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { ProceduresTree } from '../../../core';
import {
  HTTP_ERROR_STATUS_CODE,
  HTTP_SUCCESS_STATUS_CODE,
  PROTOBUF_CONTENT_TYPE,
} from '../../../core/constants';
import { ZError } from '../../../core/core-errors';
import { ZServerProtocolBase } from '../../../core/protocols/server-protocol-base';
import { ZRPC } from '../../../zrpc';
import { HttpServerApiBuilder } from './api-builder';
import { HttpContext } from './context';
import { HttpServerConfig } from './types';
import { BodyReadError } from './errors';

export class ZHttpServer<
  ZAPI extends ZRPC,
  Procedures extends ProceduresTree = ZAPI['definition']['procedures']
> extends ZServerProtocolBase {
  protected builder!: HttpServerApiBuilder<ZAPI, Procedures>;

  constructor(protected api: ZAPI, protected config: HttpServerConfig = {}) {
    super();
    config.baseUrl ||= '/';
    this.builder = new HttpServerApiBuilder(api);
  }

  get handle() {
    return this.builder.methods;
  }

  public async attach(httpServer: Server) {
    httpServer.addListener('request', async (req, res) => {
      try {
        const procedurePathArr = (req.url as string).split(
          this.config.baseUrl as string
        );

        procedurePathArr.shift();

        const procedureName: string = procedurePathArr.join('/');

        const handler = this.builder.get(procedureName);

        await this.runMiddlewares(req, res);

        const inputBuffer = await this.readBodyBuffer(req, procedureName);

        const procedureData = this.api.proceduresDataParsers.get(procedureName);
        const inputDecodedData = procedureData.input.decode(inputBuffer);
        const context = new HttpContext(req, res, inputDecodedData);

        const handlerResult = await handler.run(context);
        const outputBuffer = procedureData.output.encode(handlerResult);

        this.dispatch(res, HTTP_SUCCESS_STATUS_CODE, Buffer.from(outputBuffer));
      } catch (e) {
        this.dispatchError(res, e as Error);
      }
    });
  }

  protected async runMiddlewares(
    req: IncomingMessage,
    res: ServerResponse<IncomingMessage>
  ) {
    if (!this.config || !Array.isArray(this.config.middlewares)) return;

    for (const midde of this.config.middlewares) {
      await (midde as any)(req, res);
    }
  }

  private dispatchError(res: ServerResponse<IncomingMessage>, e: Error) {
    if (e instanceof ZError) {
      this.dispatchZError(res, e);
    } else {
      this.dispatchStandardError(res, e);
    }
  }

  private dispatchZError(res: ServerResponse<IncomingMessage>, error: ZError) {
    this.dispatch(
      res,
      HTTP_ERROR_STATUS_CODE,
      Buffer.from(error.getResponseBuffer())
    );
  }

  private dispatchStandardError(
    res: ServerResponse<IncomingMessage>,
    e: Error
  ) {
    res.statusCode = HTTP_ERROR_STATUS_CODE;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: e.message, name: e.name }), 'utf8');
  }

  private dispatch(
    res: ServerResponse<IncomingMessage>,
    statusCode: number,
    data: Buffer
  ) {
    res.setHeader('Content-Type', PROTOBUF_CONTENT_TYPE);
    res.statusCode = statusCode;
    res.end(data, 'binary');
  }

  private async readBodyBuffer(
    req: IncomingMessage,
    procedureName: string
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const arr: Buffer[] = [];

      function onData(chunk: Buffer) {
        arr.push(chunk);
      }

      function onError(err: Error) {
        req.off('data', onData);
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        req.off('end', onEnd);
        reject(new BodyReadError(procedureName, `${err.name}: ${err.message}`));
      }

      function onEnd() {
        req.off('data', onData);
        req.off('error', onError);
        resolve(Buffer.concat(arr));
      }

      req.on('data', onData);
      req.on('end', onEnd);
      req.on('error', onError);
    });
  }
}
