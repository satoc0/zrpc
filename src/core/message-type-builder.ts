import { Field, Type } from 'protobufjs/light';
import { SchemaDefinition, SchemaTypes } from './api-definition';
import { MESSAGE_START_FIELD_OFFSET } from './constants';
import {
  ProcedureDataSide,
  ProtobufDefaultFieldTypes,
  ProtobufTypesWithOptional,
} from './schema-types';

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

type MetadataField = {
  fieldName: string;
  fieldId: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  type: ProtobufDefaultFieldTypes;
  isOptional: boolean;
};

export enum MessageType {
  Call,
  CallResponse,
}

export const PROCEDURE_SCHEMA_METADATA_MESSAGE_TYPE: MetadataField = {
  fieldName: 'zrpc__meta__messageType',
  fieldId: 1,
  type: 'uint32',
  isOptional: false,
};

export const PROCEDURE_SCHEMA_METADATA_PROCEDURE_NAME: MetadataField = {
  fieldName: 'zrpc__meta__procedureName',
  fieldId: 2,
  type: 'string',
  isOptional: false,
};

const allProcedureMetadataFields: MetadataField[] = [
  PROCEDURE_SCHEMA_METADATA_MESSAGE_TYPE,
  PROCEDURE_SCHEMA_METADATA_PROCEDURE_NAME,
];

function addProcedureMetadataFields(rootType: Type) {
  for (const procedureMetadataField of allProcedureMetadataFields) {
    const field = new Field(
      procedureMetadataField.fieldName,
      procedureMetadataField.fieldId,
      procedureMetadataField.type,
      procedureMetadataField.isOptional ? 'optional' : 'required'
    );
    rootType.add(field);
  }
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

  addProcedureMetadataFields(type);

  return type;
}
