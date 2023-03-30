import { ZRPC } from '../src/zrpc';
import { Field, Schema, SchemaBase } from '../src/core/schemas';

@Schema('GetAccountCommandInput')
export class GetAccountCommandInput extends SchemaBase<GetAccountCommandInput> {
  @Field('string')
  public name!: string;
}

@Schema('GetAccountCommandOutput')
export class GetAccountCommandOutput extends SchemaBase<GetAccountCommandOutput> {
  @Field('string')
  public name!: string;
}

export const api = new ZRPC({
  procedures: {
    getAccount: {
      input: {
        square: 'int32',
        optional: 'string?',
      },
      output: {
        square: 'int32',
      },
    },
    GetAccountCommand: {
      input: GetAccountCommandInput,
      output: GetAccountCommandOutput,
    },
  },
});
