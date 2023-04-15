import { Long } from 'protobufjs/light';
import { SchemaDef, SchemaTypes } from './api-definition';
export type ValueOf<T> = T[keyof T];

export type ProtobufDefaultFieldTypes =
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
  | 'bytes';

export type ProtobufFieldTypes = ProtobufDefaultFieldTypes | object;

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

type TypeDescriptor<T, O extends boolean> = { type: T; optional: O };

export type ProtobufToPrimiviteMap = {
  double: TypeDescriptor<number, false>;
  'double?': TypeDescriptor<number, true>;
  float: TypeDescriptor<number, false>;
  'float?': TypeDescriptor<number, true>;
  int32: TypeDescriptor<number, false>;
  'int32?': TypeDescriptor<number, true>;
  uint32: TypeDescriptor<number, false>;
  'uint32?': TypeDescriptor<number, true>;
  sint32: TypeDescriptor<number, false>;
  'sint32?': TypeDescriptor<number, true>;
  fixed32: TypeDescriptor<number, false>;
  'fixed32?': TypeDescriptor<number, true>;
  sfixed32: TypeDescriptor<number, false>;
  'sfixed32?': TypeDescriptor<number, true>;
  int64: TypeDescriptor<number, false>;
  'int64?': TypeDescriptor<number, true>;
  uint64: TypeDescriptor<number, false>;
  'uint64?': TypeDescriptor<number, true>;
  sint64: TypeDescriptor<number, false>;
  'sint64?': TypeDescriptor<number, true>;
  fixed64: TypeDescriptor<number, false>;
  'fixed64?': TypeDescriptor<number, true>;
  sfixed64: TypeDescriptor<number, false>;
  'sfixed64?': TypeDescriptor<number, true>;
  string: TypeDescriptor<string, false>;
  'string?': TypeDescriptor<string, true>;
  bool: TypeDescriptor<boolean, false>;
  'bool?': TypeDescriptor<boolean, true>;
  bytes: TypeDescriptor<Buffer, false>;
  'bytes?': TypeDescriptor<Buffer, true>;
};

export type ProtobufToPrimivite<T extends SchemaTypes> =
  T extends ProtobufTypesWithOptional
    ? ProtobufToPrimiviteMap[T] extends TypeDescriptor<any, any>
      ? ProtobufToPrimiviteMap[T]['optional'] extends true
        ? undefined | null | ProtobufToPrimiviteMap[T]['type']
        : ProtobufToPrimiviteMap[T]['type']
      : unknown
    : T extends object
    ? { [K in keyof T]: ProtobufToPrimivite<T[K]> }
    : unknown;

export type SchemaToType<Schema extends SchemaDef> = Schema extends SchemaTypes
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

export enum ProcedureDataSide {
  Input = 'input',
  Output = 'output',
}

export enum ProcedureDataOperation {
  Encode = 'Encode',
  Decode = 'Decode',
}
