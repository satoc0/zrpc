import type { IncomingMessage, ServerResponse } from 'http';
import { Properties } from '../core';
import { ApiProceduresMap } from '../core/api-definition';
import { PROTOBUF_CONTENT_TYPE } from '../core/constants';
import { ProcedureNotFound, ZError } from '../core/core-errors';
import { ZRPC } from '../zrpc';
import { ProcedureHandler } from './procedure-handler';
import { BodyReadError } from './server-errors';

type HandlerMap = Map<string, ProcedureHandler>;

export class ZServer<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> {
  private handlersMap: HandlerMap = new Map();

  constructor(private def: ZAPI) {}

  public entry = async (
    req: IncomingMessage,
    res: ServerResponse<IncomingMessage>
  ) => {
    try {
      const procedureName = (req.url as string).slice(1);
      const handler = this.handlersMap.get(procedureName);

      if (!handler) {
        throw new ProcedureNotFound(procedureName);
      }

      const buffer = await this.readBuffer(req);
      const procedureData = this.def.proceduresDataParsers.get(procedureName);
      const inputDecodedData = procedureData.input.decode(buffer);
      const handlerResult = await handler.run(inputDecodedData);
      const outputBuffer = procedureData.output.encode(handlerResult);

      this.dispatch(res, 200, Buffer.from(outputBuffer));
    } catch (e) {
      this.dispatchError(res, e as Error);
    }
  };

  private dispatchError(res: ServerResponse<IncomingMessage>, e: Error) {
    if (e instanceof ZError) {
      this.dispatchZError(res, e);
    } else {
      this.dispatchStandardError(res, e);
    }
  }

  private dispatchZError(res: ServerResponse<IncomingMessage>, error: ZError) {
    this.dispatch(res, 500, Buffer.from(error.getResponseBuffer()));
  }

  private dispatchStandardError(
    res: ServerResponse<IncomingMessage>,
    e: Error
  ) {
    res.statusCode = 500;
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

  handle<Name extends keyof Procedures, Command extends Procedures[Name]>(
    name: Name,
    handler: (
      data: Properties<Command['input']['prototype']>
    ) => Promise<Properties<Command['output']['prototype']>>
  ): void {
    const procedureHandler = new ProcedureHandler(name as string, handler);

    this.handlersMap.set(name as string, procedureHandler);
  }

  private async readBuffer(req: IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const arr: Buffer[] = [];

      req.on('data', (chunk: Buffer) => {
        arr.push(chunk);
      });

      req.on('end', () => {
        resolve(Buffer.concat(arr));
      });

      req.on('error', (err) => {
        reject(new BodyReadError(`${err.name}: ${err.message}`));
      });
    });
  }
}
