import { NextRestApi } from "../src/next-rest-api"
import { Field, Schema, SchemaBase } from "../src/core/schemas";



@Schema("GetAccountCommandInput")
export class GetAccountCommandInput extends SchemaBase<GetAccountCommandInput> {
  @Field('string')
  public name!: string;

}

@Schema("GetAccountCommandOutput")
export class GetAccountCommandOutput extends SchemaBase<GetAccountCommandOutput> {

  @Field('string')
  public name!: string;

}

export const api = new NextRestApi({
  commands: {
    GetAccountCommand: {
      id: 1,
      input: GetAccountCommandInput,
      output: GetAccountCommandOutput
    }
  },
});

