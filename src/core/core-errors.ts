import { encodeByClassSchema } from './procedure-data';
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
    return encodeByClassSchema(ZErrorData, {
      errorCode: this.errorCode,
      message: this.message,
      auxData: this.auxData,
    });
  }

  constructor(
    public readonly errorCode: string,
    public readonly message: string,
    public readonly auxData: string
  ) {
    super(message);
  }
}

export class InvalidSchemaData extends ZError {
  constructor(public readonly procedureName: string) {
    super('invalid-schema', 'Invalid schema: ' + procedureName, '');
  }
}

export class ParserDataError extends ZError {
  constructor(
    public readonly procedureName: string,
    public readonly side: 'Input' | 'Output',
    process: 'Encode' | 'Decode',
    name: string,
    message: string,
    data: unknown
  ) {
    super(
      'parser-' + process.toLocaleLowerCase(),
      `Procedure: ${procedureName};\nError: ${name};\n${message};\nData: ${data}`,
      ''
    );
  }
}

export class ProcedureParserNotFound extends ZError {
  constructor(public readonly procedureName: string) {
    super(
      'parser-not-found',
      'Procedure parser not found for: ' + procedureName,
      ''
    );
  }
}

export class ProcedureNotFound extends ZError {
  constructor(public readonly procedureName: string) {
    super(
      'procedure-not-found',
      'Procedure handler not found: ' + procedureName,
      ''
    );
  }
}
