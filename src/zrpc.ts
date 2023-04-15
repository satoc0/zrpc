import { ApiDefinition, ApiProceduresMap } from './core/api-definition';
import { ZProceduresDataParsers } from './core/procedures/procedure-data';

export class ZRPC<ApiProcedures extends ApiProceduresMap = ApiProceduresMap> {
  public readonly proceduresDataParsers!: ZProceduresDataParsers;

  constructor(
    public readonly apiDefinition: ApiDefinition<ApiProcedures>,
    public readonly procedures = apiDefinition.procedures
  ) {
    this.proceduresDataParsers = new ZProceduresDataParsers(
      this.apiDefinition.procedures
    );
  }
}
