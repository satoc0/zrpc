import {
  Constructor,
  Field as ProtobufField,
  Message,
  Type,
} from 'protobufjs/light';
import { FieldOptions, FieldTypes } from './types';

const lastFieldIdSymbol = Symbol('lastFieldId');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNextFieldId(target: any): number {
  if (typeof target[lastFieldIdSymbol] === 'undefined') {
    target[lastFieldIdSymbol] = 0;
  } else {
    ++target[lastFieldIdSymbol];
  }

  return target[lastFieldIdSymbol];
}

export class SchemaBase<T extends object = object> extends Message<T> {}

export function Schema<T extends SchemaBase<T>>(name: string) {
  return (target: Constructor<T>) => {
    return Type.d<T>(name)(target);
  };
}

export const Field =
  (fieldType: FieldTypes | typeof Message, options?: FieldOptions) =>
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
  (fieldType: FieldTypes, options?: Omit<FieldOptions, 'rule'>) =>
  (target: object, propertyKey: string) => {
    const fieldId = getNextFieldId(target.constructor);

    return ProtobufField.d(
      fieldId,
      fieldType,
      'repeated',
      options?.defaultValue
    )(target, propertyKey);
  };
