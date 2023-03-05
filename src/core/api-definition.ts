import { Constructor } from 'protobufjs';
import { SchemaBase } from './schemas';

export interface ApiDefinition<
  Commands extends Record<string, ApiCommandDefinition>
> {
  commands: Commands;
}

export interface ApiCommandDefinition {
  id: number;
  input: Constructor<SchemaBase>;
  output: Constructor<SchemaBase>;
}
