import { SchemaBase } from './schemas';
import { FieldTypesPrimitive } from './types';

export interface ApiDefinition<
  Procedures extends ApiProceduresMap = ApiProceduresMap
> {
  proceduresJSON: Procedures;
  procedures: Procedures;
}

export interface ApiProceduresSchemas {
  input: typeof SchemaBase;
  output: typeof SchemaBase;
}

export interface ApiProceduresSchemaJSON {
  input: SchemaDefinition;
  output: SchemaDefinition;
}

export type SchemaTypes = FieldTypesPrimitive | SchemaDefinition;

export type SchemaDefinition = {
  [keyName in string]: SchemaTypes;
};

export type ApiProceduresMap = {
  [commandName: string]: ApiProceduresSchemas | ApiProceduresSchemaJSON;
};
