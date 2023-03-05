import { ApiCommandDefinition, ApiDefinition, SchemaBase } from '../core';
import { ClientConfig } from './client.types';
export * from './client.types';
import { Buffer } from 'buffer';

export class ClientApi<
  Commands extends Record<string, ApiCommandDefinition>,
  Def extends ApiDefinition<Commands> = ApiDefinition<Commands>
> {
  static factory<Commands extends Record<string, ApiCommandDefinition>>(
    def: ApiDefinition<Commands>,
    config: ClientConfig
  ): ClientApi<Commands> {
    const instance = new ClientApi<Commands>(def, config);

    return instance;
  }

  private constructor(private def: Def, private config: ClientConfig) {}

  async exec<Name extends keyof Commands, Command extends Commands[Name]>(
    name: Name,
    input: Omit<Command['input']['prototype'], keyof SchemaBase>
  ): Promise<Omit<Command['output']['prototype'], keyof SchemaBase>> {
    const command = this.def.commands[name];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inputSchema = command.input as any;
    const inputSchemaMessage = inputSchema.fromObject(input);
    const inputBuffer = inputSchema.encode(inputSchemaMessage).finish();

    const response = await fetch(this.config.url + '/' + command.id, {
      method: 'POST',
      body: inputBuffer,
    });

    const responseBlob = await response.blob();
    const arrBuffer = await responseBlob.arrayBuffer();
    const outputBuffer = Buffer.from(arrBuffer);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const outputSchema = command.output as any;

    const outputSchemaObject = outputSchema.decode(outputBuffer);
    const outputDecodedData = outputSchema.toObject(outputSchemaObject);

    return outputDecodedData as unknown as Omit<
      Command['output']['prototype'],
      keyof SchemaBase
    >;
  }
}
