import ZRPC, { Schema, SchemaBase, Field } from '../src';

@Schema('BasicAddInput')
class BasicAddInput extends SchemaBase<BasicAddInput> {
  @Field('int32')
  left!: number;

  @Field('int32')
  right!: number;
}

@Schema('BasicAddOutput')
class BasicAddOutput extends SchemaBase<BasicAddOutput> {
  @Field('int32')
  result!: number;
}

export const api = new ZRPC({
  procedures: {
    BasicAdd: {
      input: BasicAddInput,
      output: BasicAddOutput,
    },
  },
});
