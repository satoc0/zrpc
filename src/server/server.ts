import type { IncomingMessage, ServerResponse } from 'node:http';
import { SchemaDefToType } from '../core';
import { ApiProceduresMap } from '../core/api-definition';
import {
  HTTP_ERROR_STATUS_CODE,
  HTTP_SUCCESS_STATUS_CODE,
  PROTOBUF_CONTENT_TYPE,
} from '../core/constants';
import { ProcedureNotFound, ZError } from '../core/core-errors';
import { ZRPC } from '../zrpc';
import { ProcedureHandler } from './procedure-handler';
import { BodyReadError } from './server-errors';
import { MiddlewareHandler, ServerConfig } from './server.types';

type HandlerMap = Map<string, ProcedureHandler<any, any>>;

export class ZServer<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> {
  private handlersMap: HandlerMap = new Map();

  constructor(private def: ZAPI, private config?: ServerConfig) {}

  public extend(
    config: ServerConfig
  ): Omit<ZServer<ZAPI, Procedures>, 'entry'> {
    return new ZServer(this.def, config);
  }

  public async entry(
    req: IncomingMessage,
    res: ServerResponse<IncomingMessage>
  ) {
    try {
      const procedureName = (req.url as string).slice(1);
      const handler = this.handlersMap.get(procedureName);

      if (!handler) {
        throw new ProcedureNotFound(procedureName);
      }

      const buffer = await this.readBuffer(req, procedureName);
      const procedureData = this.def.proceduresDataParsers.get(procedureName);
      const inputDecodedData = procedureData.input.decode(buffer);

      res.writeProcessing();

      await this.runMiddlewares(req, res, inputDecodedData);
      await handler.runMiddlewares(req, res, inputDecodedData);

      const handlerResult = await handler.run(inputDecodedData);
      const outputBuffer = procedureData.output.encode(handlerResult);

      this.dispatch(res, HTTP_SUCCESS_STATUS_CODE, Buffer.from(outputBuffer));
    } catch (e) {
      this.dispatchError(res, e as Error);
    }
  }

  private async runMiddlewares(
    req: IncomingMessage,
    res: ServerResponse,
    data: object
  ) {
    if (!this.config || !Array.isArray(this.config.middlewares)) return;

    for (const midde of this.config.middlewares) {
      await midde(req, res, data);
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

  handle<Name extends keyof Procedures, Procedure extends Procedures[Name]>(
    name: Name,
    handler: (
      data: SchemaDefToType<Procedure['input']>
    ) => Promise<SchemaDefToType<Procedure['output']>>,
    middlewares: MiddlewareHandler<Procedure['input']>[] = []
  ): ZServer<ZAPI, Procedures> {
    const procedureHandler = new ProcedureHandler<
      Procedure['input'],
      Procedure['output']
    >(name as string, handler, middlewares);

    this.handlersMap.set(name as string, procedureHandler);

    return this;
  }

  private async readBuffer(
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
