import { ApiProceduresMap, Properties, SchemaDefToType } from '../core';
import { ZRPC } from '../zrpc';
import { ZClientRequest } from './client-request';
import { ClientConfig } from './client.types';

export class ZClient<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> {
  constructor(private def: ZAPI, private config?: ClientConfig) {}

  async exec<
    Name extends keyof Procedures,
    Procedure extends Procedures[Name],
    I = SchemaDefToType<Procedure['input']>,
    O = SchemaDefToType<Procedure['output']>
  >(name: Name, input: Properties<I>): Promise<O> {
    const procedureData = this.def.proceduresDataParsers.get(name as string);

    const clientRequest = new ZClientRequest(procedureData, input);

    const requestBase: RequestInit = this.config?.requestBuilder
      ? await this.config.requestBuilder()
      : {};

    const response = await clientRequest.fetch(this.getBaseUrl(), requestBase);

    return response as O;
  }

  private getBaseUrl(): string {
    return this.config?.url ?? window.location.origin;
  }
}
