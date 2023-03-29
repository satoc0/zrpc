import { SchemaBase } from './schemas';
import { ProtobufTypesWithOptional } from './types';

export interface ApiDefinition<
  Procedures extends ApiProceduresMap = ApiProceduresMap
> {
  procedures: Procedures;
}

export type ApiProceduresSchemas = {
  input: SchemaDef;
  output: SchemaDef;
};

export interface ApiProceduresSchemasDecorators {
  input: typeof SchemaBase;
  output: typeof SchemaBase;
}

export type SchemaDef = typeof SchemaBase | SchemaDefinition;

export interface ApiProceduresSchemaJSON {
  input: SchemaDefinition;
  output: SchemaDefinition;
}

export type SchemaTypes = ProtobufTypesWithOptional | SchemaDefinition;

export type SchemaDefinition = {
  [keyName in string]: SchemaTypes;
};

export type ApiProceduresMap = {
  [commandName: string]: ApiProceduresSchemas;
};
