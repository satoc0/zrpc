import { SchemaBase } from './schemas';

export interface ApiDefinition<Commands extends ApiCommandsMap> {
  commands: Commands;
}

export interface ApiCommandSchemas {
  input: typeof SchemaBase;
  output: typeof SchemaBase;
}

export type ApiCommandsMap = { [commandName: string]: ApiCommandSchemas };
