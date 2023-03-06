import { Buffer } from 'buffer';
import { ApiCommandsMap, ApiDefinition, Properties } from '../core';
import { decodeCommand, encodeCommand } from '../core/packet-parsers';
import { ClientConfig } from './client.types';
export * from './client.types';

export class ClientApi<
  Commands extends ApiCommandsMap,
  Def extends ApiDefinition<Commands> = ApiDefinition<Commands>
> {
  static factory<Commands extends ApiCommandsMap>(
    def: ApiDefinition<Commands>,
    config: ClientConfig
  ): ClientApi<Commands> {
    const instance = new ClientApi<Commands>(def, config);

    return instance;
  }

  private constructor(private def: Def, private config: ClientConfig) {}

  async exec<Name extends keyof Commands, Command extends Commands[Name]>(
    name: Name,
    input: Properties<Command['input']['prototype']>
  ): Promise<Properties<Command['output']['prototype']>> {
    const inputData = { ...input } as any;
    const command = this.def.commands[name];
    const inputBuffer = encodeCommand(command.input, inputData);

    const response = await fetch(this.config.url + '/' + (name as string), {
      method: 'POST',
      body: inputBuffer,
    });

    const responseBlob = await response.blob();
    const arrBuffer = await responseBlob.arrayBuffer();
    const outputBuffer = Buffer.from(arrBuffer);
    const outputDecodedData = decodeCommand(command.output, outputBuffer);

    return outputDecodedData as unknown as Properties<
      Command['output']['prototype']
    >;
  }
}
