import { Buffer } from 'buffer';
import { Type } from 'protobufjs';
import {
  ApiProceduresMap,
  ApiProceduresSchemas,
  SchemaDef,
  SchemaDefinition,
} from './api-definition';
import {
  InvalidSchemaData,
  ParserDataError,
  ProcedureParserNotFound,
} from './core-errors';
import {
  ProcedureDataOperation,
  ProcedureDataSide,
  Properties,
} from './schema-types';
import { SchemaBase } from './schemas';
import {
  MessageType,
  PROCEDURE_SCHEMA_METADATA_MESSAGE_TYPE,
  PROCEDURE_SCHEMA_METADATA_PROCEDURE_NAME,
  protobufProcedureTypeConstructor,
} from './message-type-constructors';

export function encodeByClassSchema<
  Schema extends typeof SchemaBase,
  Data = Properties<Schema>
>(schema: typeof SchemaBase, data: Data): Uint8Array {
  const inputData = { ...data } as any;
  const validationError = schema.verify(data as unknown as object);

  if (validationError !== null) {
    throw new InvalidSchemaData(validationError);
  }

  const inputSchemaMessage = schema.fromObject(inputData);
  return schema.encode(inputSchemaMessage).finish();
}

export function decodeByClassSchema<O extends object>(
  schema: typeof SchemaBase,
  buffer: Buffer
): O {
  const schemaObject = schema.decode(buffer);
  const decodedData = schema.toObject(schemaObject);
  return decodedData as O;
}

abstract class ZProcedureDataParserSchema {
  protected readonly procedureName!: string;

  protected readonly schemaName!: string;

  protected readonly side!: ProcedureDataSide;

  protected throwError(
    e: Error,
    _process: ProcedureDataOperation,
    data: unknown
  ): never {
    throw new ParserDataError(
      this.schemaName,
      this.side,
      _process,
      e.name,
      e.message,
      data
    );
  }

  abstract encode(data: object): Uint8Array;
  abstract decode(buffer: Buffer): object;

  populateDefaultMeta(targetObject: any) {
    targetObject[PROCEDURE_SCHEMA_METADATA_MESSAGE_TYPE.fieldName] =
      MessageType.Call;
    targetObject[PROCEDURE_SCHEMA_METADATA_PROCEDURE_NAME.fieldName] =
      this.procedureName;
  }

  cleanUpMetadata(targetObject: any) {
    delete targetObject[PROCEDURE_SCHEMA_METADATA_MESSAGE_TYPE.fieldName];
    delete targetObject[PROCEDURE_SCHEMA_METADATA_PROCEDURE_NAME.fieldName];
  }
}

export class ZProcedureDataSchemaDefinitionParser extends ZProcedureDataParserSchema {
  private schema!: Type;

  constructor(
    protected readonly procedureName: string,
    protected readonly side: ProcedureDataSide,
    protected readonly schemaName: string,
    schemaDefinition: SchemaDefinition
  ) {
    super();

    this.schema = protobufProcedureTypeConstructor(
      side,
      schemaName,
      schemaDefinition
    );
  }

  public encode(data: object): Uint8Array {
    try {
      const workObject = structuredClone(data);

      this.populateDefaultMeta(workObject);

      const message = this.schema.create(data);
      const buffer = this.schema.encode(message).finish();
      return buffer;
    } catch (e) {
      this.throwError(e as Error, ProcedureDataOperation.Encode, data);
    }
  }

  public decode(buffer: Buffer, cleanUpMetadata = true): object {
    try {
      const message = this.schema.decode(buffer);
      const decodedObject = message.toJSON();

      if (cleanUpMetadata) {
        this.cleanUpMetadata(decodedObject);
      }

      return decodedObject;
    } catch (e) {
      this.throwError(e as Error, ProcedureDataOperation.Decode, buffer);
    }
  }
}

export class ZProcedureDataSchemaParser extends ZProcedureDataParserSchema {
  constructor(
    protected procedurePathName: string,
    protected side: ProcedureDataSide,
    protected schemaName: string,
    private schema: typeof SchemaBase
  ) {
    super();
  }

  public encode(data: object): Uint8Array {
    try {
      const workObject = structuredClone(data);

      this.populateDefaultMeta(workObject);

      const result = encodeByClassSchema(this.schema, data);
      return result;
    } catch (e) {
      this.throwError(e as Error, ProcedureDataOperation.Encode, data);
    }
  }

  public decode(buffer: Buffer): object {
    try {
      const result = decodeByClassSchema(this.schema, buffer);
      return result;
    } catch (e) {
      this.throwError(e as Error, ProcedureDataOperation.Decode, buffer);
    }
  }
}

/**
 * This class has the responsability to create procedure data parsers
 * encoders and decoders
 */
export class ZProcedureDataParser {
  public readonly input!: ZProcedureDataParserSchema;

  public readonly output!: ZProcedureDataParserSchema;

  constructor(
    public readonly procedurePathName: string,
    schemas: ApiProceduresSchemas
  ) {
    this.input = this.createSchemaParserInstance(
      ProcedureDataSide.Input,
      procedurePathName,
      schemas.input
    );
    this.output = this.createSchemaParserInstance(
      ProcedureDataSide.Output,
      procedurePathName,
      schemas.output
    );
  }

  private createSchemaParserInstance(
    side: ProcedureDataSide,
    name: string,
    schema: SchemaDef
  ): ZProcedureDataParserSchema {
    return schema.constructor.name === 'Object'
      ? new ZProcedureDataSchemaDefinitionParser(
          this.procedurePathName,
          side,
          name,
          schema as SchemaDefinition
        )
      : new ZProcedureDataSchemaParser(
          this.procedurePathName,
          side,
          name,
          schema as typeof SchemaBase
        );
  }
}

export function isProcedureSchema(
  target: ApiProceduresMap | ApiProceduresSchemas
): target is ApiProceduresSchemas {
  const keys: string[] = Object.keys(target).sort();
  const [input, output] = keys;

  return keys.length === 2 && input === 'input' && output === 'output';
}

export class ZProceduresDataParsers {
  private map: Map<string, ZProcedureDataParser> = new Map();

  constructor(private proceduresMap: ApiProceduresMap) {
    this.buildMap(proceduresMap);
  }

  private buildMap(map: ApiProceduresMap, procedurePathArr: string[] = []) {
    for (const procedureName in map) {
      const procedure = map[procedureName];

      procedurePathArr.push(procedureName);

      if (isProcedureSchema(procedure)) {
        procedurePathArr.pop();

        const procedurePath: string = [...procedurePathArr, procedureName].join(
          '.'
        );

        this.map.set(
          procedurePath,
          new ZProcedureDataParser(procedurePath, procedure)
        );
      } else {
        this.buildMap(procedure, procedurePathArr);

        procedurePathArr.pop();
      }
    }
  }

  public get(name: string): ZProcedureDataParser {
    const item = this.map.get(name);

    if (!item) {
      throw new ProcedureParserNotFound(name);
    }

    return item;
  }
}
