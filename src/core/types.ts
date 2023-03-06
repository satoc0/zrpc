import { Long } from 'protobufjs/light';
export type ValueOf<T> = T[keyof T];

export type FieldTypes =
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
