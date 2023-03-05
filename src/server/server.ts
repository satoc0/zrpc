import type { IncomingMessage, ServerResponse } from 'http';
import { ApiCommandDefinition, ApiDefinition } from '../core/api-definition';
import { SchemaBase } from '../core/schemas';

export class ServerApi<
  Commands extends Record<string, ApiCommandDefinition>,
  Def extends ApiDefinition<Commands> = ApiDefinition<Commands>
> {
  static factory<Commands extends Record<string, ApiCommandDefinition>>(
    def: ApiDefinition<Commands>
  ): ServerApi<Commands> {
    const instance = new ServerApi<Commands>(def);

    // await instance.build();

    return instance;
  }

  private handlersMap: Map<
    number,
    {
      name: keyof Commands;
      handler: <Name extends keyof Commands = keyof Commands>(
        data: Omit<Commands[Name]['input']['prototype'], keyof SchemaBase>
      ) => Promise<
        Omit<Commands[Name]['output']['prototype'], keyof SchemaBase>
      >;
    }
  > = new Map();

  private constructor(private def: Def) {}

  public entry = async (
    req: IncomingMessage,
    res: ServerResponse<IncomingMessage>
  ) => {
    const eventId = Number((req.url as string).slice(1));
    const nameAndHandler = this.handlersMap.get(eventId);

    if (!nameAndHandler) {
      this.dispatch(res, 404, Buffer.from(''));
      return;
    }

    const buffer = await this.readBuffer(req);

    const commandConfig = this.def.commands[nameAndHandler.name];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inputSchema = commandConfig.input as any;
    const inputSchemaObject = inputSchema.decode(buffer);
    const inputSchemaDecodedData = inputSchema.toObject(inputSchemaObject);

    const handlerResponseRawData = await nameAndHandler.handler(
      inputSchemaDecodedData
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const outputSchema = commandConfig.output as any;

    const responseMessage = outputSchema.fromObject(handlerResponseRawData);
    const responseBuffer = outputSchema.encode(responseMessage).finish();

    res.statusCode = 200;
    res.write(responseBuffer);
    res.end();
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
      data: Omit<Command['input']['prototype'], keyof SchemaBase>
    ) => Promise<Omit<Command['output']['prototype'], keyof SchemaBase>>
  ): void {
    const commandConfig = this.def.commands[name];

    this.handlersMap.set(commandConfig.id, { name, handler });
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
