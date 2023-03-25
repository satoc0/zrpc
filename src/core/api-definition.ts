import { SchemaBase } from './schemas';

export interface ApiDefinition<
  Procedures extends ApiProceduresMap = ApiProceduresMap
> {
  procedures: Procedures;
}

export interface ApiProceduresSchemas {
  input: typeof SchemaBase;
  output: typeof SchemaBase;
}

export type ApiProceduresMap = { [commandName: string]: ApiProceduresSchemas };
