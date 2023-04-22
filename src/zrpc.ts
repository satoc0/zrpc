import { ApiConfig, ProceduresTree } from './core/api-definition';
import { ZProceduresSerialization } from './core/procedures/procedure-data';

export class ZRPC<ApiProcedures extends ProceduresTree = ProceduresTree> {
  public readonly proceduresDataParsers!: ZProceduresSerialization;

  constructor(
    public readonly definition: ApiConfig<ApiProcedures>,
    public readonly procedures = definition.procedures
  ) {
    this.proceduresDataParsers = new ZProceduresSerialization(
      this.definition.procedures
    );
  }
}
