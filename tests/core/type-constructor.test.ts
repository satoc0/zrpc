import { Field, Type } from 'protobufjs';
import { SchemaDefinition } from '../../src/core';
import { rootConstructor } from '../../src/core/type-constructor';

it('should create type by json definition', () => {
  const jsonDef: SchemaDefinition = {
    str: 'string',
    strOptional: 'string?',
    subType: {
      num: 'int32',
    },
  };

  const typeName = 'type';
  const typeCreated = rootConstructor(typeName, jsonDef);

  expect(typeCreated).toBeInstanceOf(Type);

  expect(Object.values(typeCreated.fields).length).toBe(3);

  expect(typeCreated.fields.str).toBeInstanceOf(Field);
  expect(typeCreated.fields.strOptional).toBeInstanceOf(Field);
  expect(typeCreated.fields.subType).toBeInstanceOf(Field);

  expect(typeCreated.nested?.subType_type).toBeInstanceOf(Type);

  expect(typeCreated.name).toBe(typeName);

  expect(typeCreated.fields.str.name).toBe('str');
  expect(typeCreated.fields.str.optional).toBeFalsy();

  expect(typeCreated.fields.strOptional.name).toBe('strOptional');
  expect(typeCreated.fields.strOptional.optional).toBeTruthy();

  expect(typeCreated.fields.subType.name).toBe('subType');
  expect(typeCreated.fields.subType.type).toBe('subType_type');
});
