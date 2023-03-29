import {
  Constructor,
  Field as ProtobufField,
  Message,
  Type,
} from 'protobufjs/light';
import { FieldOptions, ProtobufFieldTypes } from './types';

export enum PacketType {
  ProcedureDataCommunication = 1,
}

const autoincrementFieldIdSymbol = Symbol('lastFieldId');
const startFieldIdOffset = 0;

function getNextFieldId(target: any): number {
  if (typeof target[autoincrementFieldIdSymbol] === 'undefined') {
    target[autoincrementFieldIdSymbol] = startFieldIdOffset;
  } else {
    ++target[autoincrementFieldIdSymbol];
  }

  return target[autoincrementFieldIdSymbol];
}

/**
 * Prevent registry same schema twice
 */
const registeredSchemas: Set<string> = new Set();

export class SchemaBase<T extends object = object> extends Message<T> {}

export function Schema<T extends SchemaBase<T>>(name: string) {
  return (target: Constructor<T>) => {
    if (registeredSchemas.has(name)) {
      return;
    }

    registeredSchemas.add(name);

    return Type.d<T>(name)(target);
  };
}

export const Field =
  (fieldType: ProtobufFieldTypes | typeof Message, options?: FieldOptions) =>
  (target: object, propertyKey: string) => {
    const fieldId = getNextFieldId(target.constructor);

    return ProtobufField.d(
      fieldId,
      fieldType,
      options?.rule,
      options?.defaultValue
    )(target, propertyKey);
  };

export const Nested =
  (schema: typeof Message, options?: FieldOptions) =>
  (target: object, propertyKey: string) => {
    const fieldId = getNextFieldId(target.constructor);

    return ProtobufField.d(
      fieldId,
      schema,
      options?.rule,
      options?.defaultValue
    )(target, propertyKey);
  };

export const FieldArray =
  (fieldType: ProtobufFieldTypes, options?: Omit<FieldOptions, 'rule'>) =>
  (target: object, propertyKey: string) => {
    const fieldId = getNextFieldId(target.constructor);

    return ProtobufField.d(
      fieldId,
      fieldType,
      'repeated',
      options?.defaultValue
    )(target, propertyKey);
  };
