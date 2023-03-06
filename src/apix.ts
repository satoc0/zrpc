import type { ClientApi, ClientConfig } from './client';
import { ApiCommandSchemas, ApiDefinition } from './core/api-definition';
import type { ServerApi } from './server';

export class NextRestApi<
  ApiCommands extends Record<string, ApiCommandSchemas>
> {
  constructor(private apiDefinition: ApiDefinition<ApiCommands>) {}

  async client(config: ClientConfig): Promise<ClientApi<ApiCommands>> {
    const { ClientApi } = await import('./client');

    return ClientApi.factory<ApiCommands>(this.apiDefinition, config);
  }

  async server(): Promise<ServerApi<ApiCommands>> {
    const { ServerApi } = await import('./server');

    return ServerApi.factory<ApiCommands>(this.apiDefinition);
  }
}
