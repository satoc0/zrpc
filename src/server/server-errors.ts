import { ZError } from '../core/core-errors';

export class BodyReadError extends ZError {
  constructor(originErrorMessage: string) {
    super('body-read-error', 'Body read error', originErrorMessage);
  }
}

export class ProcedureHandlerError extends ZError {
  constructor(
    public readonly procedureName: string,
    errorName: string,
    errorMessge: string
  ) {
    super(
      'procedure-handler',
      `Procedure: ${procedureName};\nError: ${errorName};\n${errorMessge}`,
      ''
    );
  }
}
