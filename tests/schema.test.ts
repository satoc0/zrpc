import { Field, Schema, SchemaBase } from '../src/core';

it('should encode and decode the schema correctly', () => {
  @Schema('BasicSchema')
  class BasicSchema extends SchemaBase<BasicSchema> {
    @Field('string')
    stringField!: string;
  }

  const raw = { stringField: 'raw' };

  const message = BasicSchema.fromObject(raw);
  const buffer = BasicSchema.encode(message).finish();
  const decoded = BasicSchema.decode(buffer);
  const decodedObj = BasicSchema.toObject(decoded);

  expect(decodedObj).toEqual(raw);
});
