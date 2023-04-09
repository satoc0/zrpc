import { SchemaBase } from './schemas';
import { ProtobufTypesWithOptional } from './schema-types';

export interface ApiDefinition<
  Procedures extends ApiProceduresMap = ApiProceduresMap
> {
  procedures: Procedures;
}

export type SchemaDef = typeof SchemaBase | SchemaDefinition;

export interface ApiProceduresSchemas {
  input: SchemaDefinition | typeof SchemaBase;
  output: SchemaDefinition | typeof SchemaBase;
}

export type SchemaTypes = ProtobufTypesWithOptional | SchemaDefinition;

export type SchemaDefinition = {
  [keyName in string]: SchemaTypes;
};

export type ApiProceduresMap = {
  [commandName: string]: ApiProceduresSchemas | ApiProceduresMap;
};
