import { PacketType, SchemaBase } from './schemas';
import { Buffer } from 'buffer';
import { InvalidSchemaData } from './schema-errors';

export function encodeCommand<I extends object>(
  schema: typeof SchemaBase,
  data: I
): Uint8Array {
  const inputData = { ...data } as any;
  inputData.__packetType = PacketType.CommandCommunication;

  const validationError = schema.verify(data);

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

export class ZPacket {
  constructor(private schema: typeof SchemaBase) {}

  public encode(data: object): Uint8Array {
    return encodeCommand(this.schema, data);
  }

  public decode(buffer: Buffer): Uint8Array {
    return decodeCommand(this.schema, buffer);
  }
}
