import { ZError } from '../core/core-errors';

export class ProcedureExecutionError extends ZError {
  constructor(
    public readonly procedureName: string,
    errorName: string,
    errorMessge: string
  ) {
    super({
      errorCode: 'procedure-execution',
      message: `${errorName}: ${errorMessge}`,
      procedureName,
    });
  }
}
