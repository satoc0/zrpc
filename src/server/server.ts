import type { IncomingMessage, ServerResponse } from 'http';
import { Properties } from '../core';
import { ApiProceduresMap } from '../core/api-definition';
import { PROTOBUF_CONTENT_TYPE } from '../core/constants';
import { ProcedureNotFound, ZError } from '../core/errors';
import { ZRPC } from '../zrpc';

type HandlerMap<Procedures extends ApiProceduresMap> = Map<
  string,
  {
    name: keyof Procedures;
    handler: <Name extends keyof Procedures = keyof Procedures>(
      data: Properties<Procedures[Name]['input']['prototype']>
    ) => Promise<Properties<Procedures[Name]['output']['prototype']>>;
  }
>;

export class ZServer<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> {
  private handlersMap: HandlerMap<Procedures> = new Map();

  constructor(private def: ZAPI) {}

  public entry = async (
    req: IncomingMessage,
    res: ServerResponse<IncomingMessage>
  ) => {
    const procedureName = (req.url as string).slice(1);
    const nameAndHandler = this.handlersMap.get(procedureName);

    if (!nameAndHandler) {
      this.dispatchError(res, new ProcedureNotFound(procedureName));
      return;
    }

    const buffer = await this.readBuffer(req);
    const procedureData = this.def.proceduresDataParsers.get(procedureName);
    const inputDecodedData = procedureData.input.decode(buffer);

    try {
      const outputRawData = await nameAndHandler.handler(
        inputDecodedData as any
      );

      const outputBuffer = procedureData.output.encode(outputRawData);

      this.dispatch(res, 200, Buffer.from(outputBuffer));
    } catch (e) {
      this.dispatchError(res, e as Error);
    } finally {
    }
  };

  private dispatchError(res: ServerResponse<IncomingMessage>, e: Error) {
    if (e instanceof ZError) {
      this.dispatchZError(res, e);
    } else {
      this.dispatchUnknownError(res, e);
    }
  }

  private dispatchZError(res: ServerResponse<IncomingMessage>, error: ZError) {
    this.dispatch(res, 400, Buffer.from(error.getResponseBuffer()));
  }

  private dispatchUnknownError(res: ServerResponse<IncomingMessage>, e: Error) {
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
    this.handlersMap.set(name as string, { name, handler });
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
        reject(err);
      });
    });
  }
}
