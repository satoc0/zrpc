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

export const __api__ = new ZRPC({
  commands: {
    GetAccountCommand: {
      id: 1,
      input: GetAccountCommandInput,
      output: GetAccountCommandOutput,
    },
  },
});

if (typeof window !== 'undefined') {
  window.__api__ = __api__;
}
