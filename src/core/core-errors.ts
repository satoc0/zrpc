import { SchemaDefinition } from './api-definition';
import { protobufTypeConstructor } from './message-type-constructors';
import { ProcedureDataOperation, ProcedureDataSide } from './schema-types';

export interface ZErrorData {
  isZError: boolean;
  errorCode: string;
  message: string;
  procedureName: string;
  auxData?: string;
}

export class ZError extends Error {
  static schemaDef: SchemaDefinition = {
    isZError: 'bool',
    errorCode: 'string',
    message: 'string',
    procedureName: 'string',
    auxData: 'string',
  };

  static schema = protobufTypeConstructor('ZError', ZError.schemaDef);

  static is(obj: any): obj is ZErrorData {
    return !!obj.isZError;
  }

  static factory(data: ZErrorData): ZError {
    return new ZError(data);
  }

  public readonly isZError = true;

  constructor(
    data: Omit<ZErrorData, 'isZError'>,
    public readonly errorCode = data.errorCode,
    public readonly message = data.message,
    public readonly procedureName = data.procedureName,
    public readonly auxData = data.auxData || ''
  ) {
    super(data.message);
  }

  getResponseBuffer(): Uint8Array {
    const message = ZError.schema.create({
      isZError: true,
      errorCode: this.errorCode,
      message: this.message,
      auxData: this.auxData,
      procedureName: this.procedureName,
    });

    const buffer = ZError.schema.encode(message).finish();
    return buffer;
  }
}

export class InvalidSchemaData extends ZError {
  constructor(public readonly procedureName: string) {
    super({
      errorCode: 'invalid-schema',
      message: 'Invalid schema: ' + procedureName,
      procedureName,
    });
  }
}

export class ParserDataError extends ZError {
  constructor(
    public readonly procedureName: string,
    public readonly side: ProcedureDataSide,
    process: ProcedureDataOperation,
    name: string,
    message: string,
    data: unknown
  ) {
    super({
      errorCode: 'parser-' + process.toLocaleLowerCase(),
      message: `${name};\n${message};\nData: ${data}`,
      procedureName,
    });
  }
}

export class ProcedureParserNotFound extends ZError {
  constructor(public readonly procedureName: string) {
    super({
      errorCode: 'parser-not-found',
      message: 'Procedure parser not found for: ' + procedureName,
      procedureName,
    });
  }
}

export class ProcedureNotFound extends ZError {
  constructor(public readonly procedureName: string) {
    super({
      errorCode: 'procedure-not-found',
      message: 'Procedure handler not found: ' + procedureName,
      procedureName,
    });
  }
}

export class BiDirectionalNotEnabled extends Error {
  constructor() {
    super(
      'Your API configuration does not have bidirectional communication enabled.'
    );
  }
}
