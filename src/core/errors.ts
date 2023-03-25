import { encodeCommand } from './procedure-data';
import { Field, Schema, SchemaBase } from './schemas';

@Schema('z-error-data')
export class ZErrorData extends SchemaBase {
  @Field('string')
  errorCode!: string;

  @Field('string')
  message!: string;

  @Field('string')
  auxData!: string;
}

export abstract class ZError extends Error {
  getResponseBuffer(): Uint8Array {
    return encodeCommand(ZErrorData, {
      errorCode: this.errorCode,
      message: this.message,
      auxData: this.auxData,
    });
  }

  constructor(
    private errorCode: string,
    public readonly message: string,
    private auxData: string
  ) {
    super(message);
  }
}

export class InvalidSchemaData extends ZError {
  constructor(public readonly procedureName: string) {
    super('invalid-schema-error', 'Invalid schema: ' + procedureName, '');
  }
}

export class ProcedureParserNotFound extends ZError {
  constructor(public readonly procedureName: string) {
    super(
      'parser-error',
      'Procedure parser not found for: ' + procedureName,
      ''
    );
  }
}

export class ProcedureNotFound extends ZError {
  constructor(public readonly procedureName: string) {
    super('procedure-not-error', 'Procedure not found: ' + procedureName, '');
  }
}
