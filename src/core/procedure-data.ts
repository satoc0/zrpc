import { Buffer } from 'buffer';
import { ApiProceduresMap, ApiProceduresSchemas } from './api-definition';
import { InvalidSchemaData, ProcedureParserNotFound } from './errors';
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
  constructor(private schema: typeof SchemaBase) {}

  public encode(data: object): Uint8Array {
    return encodeCommand(this.schema, data);
  }

  public decode(buffer: Buffer): Uint8Array {
    return decodeCommand(this.schema, buffer);
  }
}

/**
 * This class has the responsability to create procedure data parsers
 * encoders and decoders
 */
export class ZProcedureData {
  public readonly input!: ZProcedureDataSchemaParser;

  public readonly output!: ZProcedureDataSchemaParser;

  constructor(private _name: string, private schemas: ApiProceduresSchemas) {
    this.input = new ZProcedureDataSchemaParser(schemas.input);
    this.output = new ZProcedureDataSchemaParser(schemas.output);
  }

  get name(): string {
    return this._name;
  }
}

export class ZProceduresDataMap {
  private map: Map<string, ZProcedureData> = new Map();

  constructor(private proceduresMap: ApiProceduresMap) {
    this.buildMap();
  }

  private buildMap() {
    Object.entries(this.proceduresMap).forEach(([commandName, schemas]) => {
      const procedureDataInstance = new ZProcedureData(commandName, schemas);
      this.map.set(commandName, procedureDataInstance);
    });
  }

  public get(name: string): ZProcedureData {
    const item = this.map.get(name);

    if (!item) {
      throw new ProcedureParserNotFound(name);
    }

    return item;
  }
}
