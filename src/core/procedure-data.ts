import { Buffer } from 'buffer';
import { ApiProceduresMap, ApiProceduresSchemas } from './api-definition';
import {
  InvalidSchemaData,
  ParserDataError,
  ProcedureParserNotFound,
} from './core-errors';
import { PacketType, SchemaBase } from './schemas';
import { Properties } from './types';

export function encodeCommand<
  Schema extends typeof SchemaBase,
  Data = Properties<Schema>
>(schema: typeof SchemaBase, data: Data): Uint8Array {
  const inputData = { ...data } as any;
  inputData.__packetType = PacketType.ProcedureDataCommunication;

  const validationError = schema.verify(data as unknown as object);

  if (validationError !== null) {
    throw new InvalidSchemaData(validationError);
  }

  const inputSchemaMessage = schema.fromObject(inputData);
  return schema.encode(inputSchemaMessage).finish();
}

export function decodeCommand<O extends object>(
  schema: typeof SchemaBase,
  buffer: Buffer
): O {
  const schemaObject = schema.decode(buffer);
  const decodedData = schema.toObject(schemaObject);
  return decodedData as O;
}

export class ZProcedureDataSchemaParser {
  constructor(private name: string, private schema: typeof SchemaBase) {}

  public encode(data: object): Uint8Array {
    try {
      const result = encodeCommand(this.schema, data);
      return result;
    } catch (e) {
      this.throwError(e as Error, 'Encode', data);
    }
  }

  public decode(buffer: Buffer): object {
    try {
      const result = decodeCommand(this.schema, buffer);
      return result;
    } catch (e) {
      this.throwError(e as Error, 'Decode', buffer);
    }
  }

  private throwError(
    e: Error,
    _process: 'Encode' | 'Decode',
    data: unknown
  ): never {
    throw new ParserDataError(this.name, _process, e.name, e.message, data);
  }
}

/**
 * This class has the responsability to create procedure data parsers
 * encoders and decoders
 */
export class ZProcedureDataParser {
  public readonly input!: ZProcedureDataSchemaParser;

  public readonly output!: ZProcedureDataSchemaParser;

  constructor(public readonly name: string, schemas: ApiProceduresSchemas) {
    this.input = new ZProcedureDataSchemaParser(name, schemas.input);
    this.output = new ZProcedureDataSchemaParser(name, schemas.output);
  }
}

export class ZProceduresDataParsers {
  private map: Map<string, ZProcedureDataParser> = new Map();

  constructor(private proceduresMap: ApiProceduresMap) {
    this.buildMap();
  }

  private buildMap() {
    Object.entries(this.proceduresMap).forEach(([commandName, schemas]) => {
      const procedureDataInstance = new ZProcedureDataParser(
        commandName,
        schemas as ApiProceduresSchemas
      );
      this.map.set(commandName, procedureDataInstance);
    });
  }

  public get(name: string): ZProcedureDataParser {
    const item = this.map.get(name);

    if (!item) {
      throw new ProcedureParserNotFound(name);
    }

    return item;
  }
}
