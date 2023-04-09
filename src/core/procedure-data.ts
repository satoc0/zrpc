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
import { SchemaBase } from './schemas';
import { rootConstructor } from './type-constructor';
import {
  ProcedureDataOperation,
  ProcedureDataSide,
  Properties,
} from './schema-types';

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
  protected name!: string;

  protected side!: ProcedureDataSide;

  protected throwError(
    e: Error,
    _process: ProcedureDataOperation,
    data: unknown
  ): never {
    throw new ParserDataError(
      this.name,
      this.side,
      _process,
      e.name,
      e.message,
      data
    );
  }

  abstract encode(data: object): Uint8Array;
  abstract decode(buffer: Buffer): object;
}

export class ZProcedureDataSchemaDefinitionParser extends ZProcedureDataParserSchema {
  private schema!: Type;

  constructor(
    protected readonly side: ProcedureDataSide,
    protected readonly name: string,
    schemaDefinition: SchemaDefinition
  ) {
    super();

    this.schema = rootConstructor(side, schemaDefinition);
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

  public decode(buffer: Buffer): object {
    try {
      const message = this.schema.decode(buffer);
      return message.toJSON();
    } catch (e) {
      this.throwError(e as Error, ProcedureDataOperation.Decode, buffer);
    }
  }
}

export class ZProcedureDataSchemaParser extends ZProcedureDataParserSchema {
  constructor(
    protected side: ProcedureDataSide,
    protected name: string,
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

  constructor(public readonly name: string, schemas: ApiProceduresSchemas) {
    this.input = this.createSchemaParserInstance(
      ProcedureDataSide.Input,
      name,
      schemas.input
    );
    this.output = this.createSchemaParserInstance(
      ProcedureDataSide.Output,
      name,
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
          side,
          name,
          schema as SchemaDefinition
        )
      : new ZProcedureDataSchemaParser(side, name, schema as typeof SchemaBase);
  }
}

type SchemasOrNestedProcedure = ZProcedureDataParser | ApiProceduresDataParsers;

export type ApiProceduresDataParsers = {
  [procedureName: string]: SchemasOrNestedProcedure;
};

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
          '/'
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
