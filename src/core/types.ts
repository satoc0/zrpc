import { Long } from 'protobufjs/light';
import { SchemaDef, SchemaTypes } from './api-definition';
import { SchemaBase } from './schemas';
export type ValueOf<T> = T[keyof T];

export type ProtobufFieldTypes =
  | 'double'
  | 'float'
  | 'int32'
  | 'uint32'
  | 'sint32'
  | 'fixed32'
  | 'sfixed32'
  | 'int64'
  | 'uint64'
  | 'sint64'
  | 'fixed64'
  | 'sfixed64'
  | 'string'
  | 'bool'
  | 'bytes'
  | object;

export type ProtobufTypesWithOptional =
  | 'double'
  | 'double?'
  | 'float'
  | 'float?'
  | 'int32'
  | 'int32?'
  | 'uint32'
  | 'uint32?'
  | 'sint32'
  | 'sint32?'
  | 'fixed32'
  | 'fixed32?'
  | 'sfixed32'
  | 'sfixed32?'
  | 'int64'
  | 'int64?'
  | 'uint64'
  | 'uint64?'
  | 'sint64'
  | 'sint64?'
  | 'fixed64'
  | 'fixed64?'
  | 'sfixed64'
  | 'sfixed64?'
  | 'string'
  | 'string?'
  | 'bool'
  | 'bool?'
  | 'bytes'
  | 'bytes?';

export type FieldTypesNesting = ProtobufTypesWithOptional | object;

export interface ProtobufToPrimiviteMap {
  double: number;
  'double?': number;
  float: number;
  'float?': number;
  int32: number;
  'int32?': number;
  uint32: number;
  'uint32?': number;
  sint32: number;
  'sint32?': number;
  fixed32: number;
  'fixed32?': number;
  sfixed32: number;
  'sfixed32?': number;
  int64: number;
  'int64?': number;
  uint64: number;
  'uint64?': number;
  sint64: number;
  'sint64?': number;
  fixed64: number;
  'fixed64?': number;
  sfixed64: number;
  'sfixed64?': number;
  string: string;
  'string?': string;
  bool: boolean;
  'bool?': boolean;
  bytes: Buffer;
  'bytes?': Buffer;
}

export type ProtobufToPrimivite<T extends SchemaTypes> =
  T extends ProtobufTypesWithOptional
    ? ProtobufToPrimiviteMap[T]
    : T extends object
    ? { [K in keyof T]: ProtobufToPrimivite<T[K]> }
    : unknown;

export type SchemaDefToType<Schema extends SchemaDef> =
  Schema extends SchemaTypes
    ? ProtobufToPrimivite<Schema>
    : Properties<Schema['prototype']>;

export type Types =
  | number
  | number[]
  | Long
  | Long[]
  | string
  | string[]
  | boolean
  | boolean[]
  | Uint8Array
  | Uint8Array[]
  | Buffer
  | Buffer[];

export interface FieldOptions {
  rule?: 'optional' | 'required' | 'repeated';
  defaultValue?: Types;
}

export type Properties<T> = Omit<
  Pick<
    T,
    {
      [K in keyof T]: T[K] extends (...args: any[]) => unknown ? never : K;
    }[keyof T]
  >,
  '$type'
>;

export type AcceptPromise<T> = T | Promise<T>;
