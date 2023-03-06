import type { IncomingMessage, ServerResponse } from 'http';
import { Properties } from '../core';
import { ApiCommandsMap, ApiDefinition } from '../core/api-definition';
import { decodeCommand, encodeCommand } from '../core/packet-parsers';
import { InvalidSchemaData } from '../core/schema-errors';

export class ServerApi<
  Commands extends ApiCommandsMap,
  Def extends ApiDefinition<Commands> = ApiDefinition<Commands>
> {
  static factory<Commands extends ApiCommandsMap>(
    def: ApiDefinition<Commands>
  ): ServerApi<Commands> {
    const instance = new ServerApi<Commands>(def);

    // await instance.build();

    return instance;
  }

  private handlersMap: Map<
    string,
    {
      name: keyof Commands;
      handler: <Name extends keyof Commands = keyof Commands>(
        data: Properties<Commands[Name]['input']['prototype']>
      ) => Promise<Properties<Commands[Name]['output']['prototype']>>;
    }
  > = new Map();

  private constructor(private def: Def) {}

  public entry = async (
    req: IncomingMessage,
    res: ServerResponse<IncomingMessage>
  ) => {
    const commandName = (req.url as string).slice(1);
    const nameAndHandler = this.handlersMap.get(commandName);

    if (!nameAndHandler) {
      this.dispatch(res, 404, Buffer.from(''));
      return;
    }

    const buffer = await this.readBuffer(req);

    const commandConfig = this.def.commands[nameAndHandler.name];

    const inputDecodedData = decodeCommand(commandConfig.input, buffer);

    try {
      const outputRawData = await nameAndHandler.handler(
        inputDecodedData as any
      );

      const outputBuffer = encodeCommand(commandConfig.output, outputRawData);

      this.dispatch(res, 200, Buffer.from(outputBuffer));
      // res.statusCode = 200;
      // res.write(outputBuffer);
      // res.end();
    } catch (e) {
      if (e instanceof InvalidSchemaData) {
        this.dispatch(res, 400, Buffer.from('outputBuffer'));
      }
    } finally {
    }
  };

  private dispatch(
    res: ServerResponse<IncomingMessage>,
    statusCode: number,
    data: Buffer
  ) {
    res.statusCode = statusCode;
    res.end(data, 'binary');
  }

  handle<Name extends keyof Commands, Command extends Commands[Name]>(
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
