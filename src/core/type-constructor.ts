import { Field, Type } from 'protobufjs/light';
import { SchemaDefinition, SchemaTypes } from './api-definition';
import { FieldTypesPrimitive } from './types';

function fieldConstructor(
  name: string,
  schema: SchemaTypes,
  fieldId: number,
  rootType: Type
): Field {
  if (typeof schema === 'string') {
    const isOptional: boolean = (schema as FieldTypesPrimitive).endsWith('?');

    const typeName = isOptional ? schema.slice(0, -1) : schema;
    const field = new Field(name, fieldId as number, typeName, {
      optional: isOptional,
    });

    return field;
  }

  const typeroot = new Type(name + '_type');

  let fFieldId = 0;

  for (const fieldName in schema) {
    const fSchema = schema[fieldName];
    const field = fieldConstructor(fieldName, fSchema, fFieldId, typeroot);

    typeroot.add(field);

    ++fFieldId;
  }
  rootType.add(typeroot);

  const rightField = new Field(name, fieldId, typeroot.name);
  return rightField;
}

export function rootConstructor(name: string, schema: SchemaDefinition) {
  const rootType = new Type(name);

  let id = 0;
  for (const v in schema) {
    rootType.add(fieldConstructor(v, schema[v], id, rootType));
    ++id;
  }

  return rootType;
}
