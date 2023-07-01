import { Type } from 'protobufjs';
import {
  ProceduresTree,
  ProceduresSchemas,
  SchemaDef,
  SchemaDefinition,
} from '../api-definition';
import {
  InvalidSchemaDataError,
  ParserDataError,
  ProcedureParserNotFoundError,
} from '../core-errors';
import { protobufProcedureTypeBuilder } from '../message-type-builder';
import {
  ProcedureDataOperation,
  ProcedureDataSide,
  Properties,
} from '../schema-types';
import { SchemaBase } from '../schemas';

export function encodeByClassSchema<
  Schema extends typeof SchemaBase,
  Data = Properties<Schema>
>(schema: typeof SchemaBase, data: Data): Uint8Array {
  const inputData = { ...data } as any;
  const validationError = schema.verify(data as unknown as object);

  if (validationError !== null) {
    throw new InvalidSchemaDataError(validationError);
  }

  const inputSchemaMessage = schema.fromObject(inputData);
  return schema.encode(inputSchemaMessage).finish();
}

export function decodeByClassSchema<O extends object>(
  schema: typeof SchemaBase,
  buffer: Uint8Array
): O {
  const schemaObject = schema.decode(buffer);
  const decodedData = schema.toObject(schemaObject);
  return decodedData as O;
}

abstract class ZProcedureSchemaSerializer {
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
  abstract decode(buffer: Uint8Array): object;
}

export class ZProcedureJSONSchemaSerializer extends ZProcedureSchemaSerializer {
  private schema!: Type;

  constructor(
    protected readonly procedureName: string,
    protected readonly side: ProcedureDataSide,
    protected readonly schemaName: string,
    schemaDefinition: SchemaDefinition
  ) {
    super();

    this.schema = protobufProcedureTypeBuilder(
      side,
      schemaName,
      schemaDefinition
    );
  }

  public encode(data: object): Uint8Array {
    try {
      const message = this.schema.create(data);
      const buffer = this.schema.encode(message).finish();
      return buffer;
    } catch (e) {
      this.throwError(e as Error, ProcedureDataOperation.Encode, data);
    }
  }

  public decode(buffer: Uint8Array): object {
    try {
      const message = this.schema.decode(buffer);
      const decodedObject = message.toJSON();

      return decodedObject;
    } catch (e) {
      this.throwError(e as Error, ProcedureDataOperation.Decode, buffer);
    }
  }
}

export class ZProcedureClassSchemaSerializer extends ZProcedureSchemaSerializer {
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
      const result = encodeByClassSchema(this.schema, data);
      return result;
    } catch (e) {
      this.throwError(e as Error, ProcedureDataOperation.Encode, data);
    }
  }

  public decode(buffer: Uint8Array): object {
    try {
      const result = decodeByClassSchema(this.schema, buffer);
      return result;
    } catch (e) {
      this.throwError(e as Error, ProcedureDataOperation.Decode, buffer);
    }
  }
}

/**
 * This class has the responsability to create procedure data serializers
 * encoders and decoders
 */
export class ZProcedureDataSerializer {
  public readonly input!: ZProcedureSchemaSerializer;

  public readonly output!: ZProcedureSchemaSerializer;

  constructor(
    public readonly procedurePathName: string,
    schemas: ProceduresSchemas
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
  ): ZProcedureSchemaSerializer {
    return schema.constructor.name === 'Object'
      ? new ZProcedureJSONSchemaSerializer(
          this.procedurePathName,
          side,
          name,
          schema as SchemaDefinition
        )
      : new ZProcedureClassSchemaSerializer(
          this.procedurePathName,
          side,
          name,
          schema as typeof SchemaBase
        );
  }
}

export function isProcedureSchema(
  target: ProceduresTree | ProceduresSchemas
): target is ProceduresSchemas {
  const keys: string[] = Object.keys(target).sort();
  const [input, output] = keys;

  return keys.length === 2 && input === 'input' && output === 'output';
}

/**
 * This class holds the serializations of all procedures.
 */
export class ZProceduresSerialization {
  private map: Map<string, ZProcedureDataSerializer> = new Map();

  constructor(proceduresMap: ProceduresTree) {
    this.buildMap(proceduresMap);
  }

  private buildMap(map: ProceduresTree, procedurePathArr: string[] = []) {
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
          new ZProcedureDataSerializer(procedurePath, procedure)
        );
      } else {
        this.buildMap(procedure, procedurePathArr);

        procedurePathArr.pop();
      }
    }
  }

  public get(name: string): ZProcedureDataSerializer {
    const item = this.map.get(name);

    if (!item) {
      throw new ProcedureParserNotFoundError(name);
    }

    return item;
  }
}
