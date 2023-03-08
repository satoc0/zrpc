import { ApiCommandsMap, ApiDefinition, Properties } from '../core';
import { ZCommandData } from '../core/command-data';
import { ZClientRequest } from './client-request';
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

  private commands: Map<keyof Commands, ZCommandData> = new Map();

  private constructor(private def: Def, private config: ClientConfig) {
    this.instantiateCommands();
  }

  private instantiateCommands() {
    this.commands = ZCommandData.factoryCommandDataMap(this.def.commands);
  }

  async exec<Name extends keyof Commands, Command extends Commands[Name]>(
    name: Name,
    input: Properties<Command['input']['prototype']>
  ): Promise<Properties<Command['output']['prototype']>> {
    const commandData = this.commands.get(name);
    const clientRequest = new ZClientRequest(
      commandData as ZCommandData,
      input
    );

    const requestBase: RequestInit = this.config.requestBuilder
      ? await this.config.requestBuilder()
      : {};

    const response = await clientRequest.fetch(this.config.url, requestBase);

    return response as unknown as Properties<Command['output']['prototype']>;
  }
}
