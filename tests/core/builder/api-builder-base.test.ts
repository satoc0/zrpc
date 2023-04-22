import ZRPC, {
  ProceduresSchemas,
  ProceduresTree,
  SchemaToType,
} from '../../../src';
import {
  ApiBuilderBase,
  MethodBuilderReturn,
} from '../../../src/core/builder/api-builder-base';

export type ApiBuilderMap<Root extends ProceduresTree = ProceduresTree> = {
  [Key in keyof Root]: Root[Key] extends ProceduresSchemas
    ? (
        input: SchemaToType<Root[Key]['input']>
      ) => Promise<SchemaToType<Root[Key]['output']>>
    : Root[Key] extends ProceduresTree
    ? ApiBuilderMap<Root[Key]>
    : never;
};

class TesteApiBuilder<ZAPI extends ZRPC> extends ApiBuilderBase<
  ApiBuilderMap<ZAPI['definition']['procedures']>
> {
  constructor(protected api: ZAPI) {
    super(api);
  }

  protected methodFactory(): MethodBuilderReturn<any, Promise<any>> {
    return async () => {};
  }
}

describe('api-builder-base', () => {
  const basicSchema: ProceduresSchemas = {
    input: {
      value: 'string',
    },
    output: {
      value: 'string',
    },
  };

  const api = new ZRPC({
    procedures: {
      level1: basicSchema,
      nested: {
        lvl2: basicSchema,
        nested: {
          lvl3: basicSchema,
          nested: {
            lvl4: basicSchema,
          },
        },
      },
    },
  });

  it('should create correctly method callers', () => {
    const methodFactorySpy = jest.spyOn(
      TesteApiBuilder.prototype as any,
      'methodFactory'
    );

    const caller = new TesteApiBuilder(api);

    expect(methodFactorySpy).toBeCalledTimes(4);
    expect(methodFactorySpy).toBeCalledWith('level1');
    expect(methodFactorySpy).toBeCalledWith('nested/lvl2');
    expect(methodFactorySpy).toBeCalledWith('nested/nested/lvl3');
    expect(methodFactorySpy).toBeCalledWith('nested/nested/nested/lvl4');
    expect(Object.keys(caller.methods)).toEqual(['level1', 'nested']);
    expect(caller.methods.level1).toBeInstanceOf(Function);
    expect(Object.keys(caller.methods.nested)).toEqual(['lvl2', 'nested']);
    expect(caller.methods.nested.lvl2).toBeInstanceOf(Function);
    expect(Object.keys(caller.methods.nested.nested)).toEqual([
      'lvl3',
      'nested',
    ]);
    expect(caller.methods.nested.nested.lvl3).toBeInstanceOf(Function);
    expect(Object.keys(caller.methods.nested.nested.nested)).toEqual(['lvl4']);
    expect(caller.methods.nested.nested.nested.lvl4).toBeInstanceOf(Function);
  });
});
