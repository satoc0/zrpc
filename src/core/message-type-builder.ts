import { Field, Type } from 'protobufjs/light';
import { SchemaDefinition, SchemaTypes } from './api-definition';
import { MESSAGE_START_FIELD_OFFSET } from './constants';
import { ProcedureDataSide, ProtobufTypesWithOptional } from './schema-types';

function typeOrFieldBuilder(
  name: string,
  schema: SchemaTypes,
  fieldId: number,
  rootType: Type
): Field {
  if (typeof schema === 'string') {
    const isOptional: boolean = (schema as ProtobufTypesWithOptional).endsWith(
      '?'
    );

    const typeName = isOptional ? schema.slice(0, -1) : schema;
    const field = new Field(
      name,
      fieldId as number,
      typeName,
      isOptional ? 'optional' : 'required'
    );

    return field;
  }

  const typeRoot = new Type(name + '_type');

  let fFieldId = 0;

  for (const fieldName in schema) {
    const fSchema = schema[fieldName];
    const field = typeOrFieldBuilder(fieldName, fSchema, fFieldId, typeRoot);

    typeRoot.add(field);

    ++fFieldId;
  }
  rootType.add(typeRoot);

  const rightField = new Field(name, fieldId, typeRoot.name);
  return rightField;
}

export function protobufTypeBuilder(name: string, schema: SchemaDefinition) {
  const rootType = new Type(name);

  let id = MESSAGE_START_FIELD_OFFSET;
  for (const v in schema) {
    rootType.add(typeOrFieldBuilder(v, schema[v], id, rootType));
    ++id;
  }

  return rootType;
}

const nameReplaceRegExp = /[^\w]/g;

export function protobufProcedureTypeBuilder(
  side: ProcedureDataSide,
  schemaName: string,
  schema: SchemaDefinition
) {
  const typeName = `${side}__${schemaName}`.replace(nameReplaceRegExp, '');
  const type = protobufTypeBuilder(typeName, schema);
  return type;
}
