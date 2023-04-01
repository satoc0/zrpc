import { ZError } from '../core/core-errors';

export class BodyReadError extends ZError {
  constructor(
    public readonly procedureName: string,
    originErrorMessage: string
  ) {
    super({
      errorCode: 'body-read-error',
      message: 'Body read error ' + originErrorMessage,
      procedureName,
    });
  }
}

export class ProcedureHandlerError extends ZError {
  constructor(
    public readonly procedureName: string,
    errorName: string,
    errorMessge: string
  ) {
    super({
      errorCode: 'procedure-handler',
      message: `${errorName}: ${errorMessge}`,
      procedureName,
    });
  }
}
