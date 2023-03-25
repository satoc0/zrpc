import { ApiDefinition, ApiProceduresMap } from './core/api-definition';
import { ZProceduresDataMap } from './core/procedure-data';

export class ZRPC<ApiProcedures extends ApiProceduresMap = ApiProceduresMap> {
  public readonly proceduresDataParsers!: ZProceduresDataMap;

  constructor(public readonly apiDefinition: ApiDefinition<ApiProcedures>) {
    this.proceduresDataParsers = new ZProceduresDataMap(
      this.apiDefinition.procedures
    );
  }
}
