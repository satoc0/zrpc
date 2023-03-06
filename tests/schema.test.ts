import { Field, Schema, SchemaBase } from '../src/core';
@Schema('BasicSchema')
class BasicSchema extends SchemaBase<BasicSchema> {
  @Field('string')
  stringField!: string;

  @Field('string')
  stringField2!: string;
}

it('should encode and decode the schema correctly', () => {
  const raw = { stringField: 'raw', stringField2: 'raw2' };

  const message = BasicSchema.fromObject(raw);
  const buffer = BasicSchema.encode(message).finish();
  const decoded = BasicSchema.decode(buffer);
  const decodedObj = BasicSchema.toObject(decoded);

  expect(decodedObj).toEqual(raw);
});
