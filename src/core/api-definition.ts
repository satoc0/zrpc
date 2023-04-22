import { SchemaBase } from './schemas';
import { ProtobufTypesWithOptional } from './schema-types';

export interface ApiConfig<Procedures extends ProceduresTree = ProceduresTree> {
  /**
   * Define your schemas
   */
  procedures: Procedures;
}

export type SchemaDef = typeof SchemaBase | SchemaDefinition;

export interface ProceduresSchemas {
  input: SchemaDefinition | typeof SchemaBase;
  output: SchemaDefinition | typeof SchemaBase;
}

export type SchemaTypes = ProtobufTypesWithOptional | SchemaDefinition;

export type SchemaDefinition = {
  [keyName in string]: SchemaTypes;
};

export type ProceduresTree = {
  [commandName: string]: ProceduresSchemas | ProceduresTree;
};
