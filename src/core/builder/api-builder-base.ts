import { ZRPC } from '../../zrpc';
import { ProceduresTree, ProceduresSchemas } from '../api-definition';
import { isProcedureSchema } from '../procedures/procedure-data';

export type ApiBuilderMapAbstraction<
  Root extends ProceduresTree = ProceduresTree
> = {
  [Key in keyof Root]: Root[Key] extends ProceduresSchemas
    ? unknown
    : Root[Key] extends ProceduresTree
    ? ApiBuilderMapAbstraction<Root[Key]>
    : object;
};

export type MethodBuilderReturn<I = unknown, O = unknown> = (input: I) => O;

export abstract class ApiBuilderBase<
  BuilderMap extends ApiBuilderMapAbstraction = ApiBuilderMapAbstraction
> {
  public readonly methods: BuilderMap = {} as BuilderMap;

  constructor(protected api: ZRPC) {
    this.makeBuilder(api.definition.procedures);
  }

  protected makeBuilder(map: ProceduresTree, procedurePathArr: string[] = []) {
    for (const procedureName in map) {
      const procedure = map[procedureName];

      procedurePathArr.push(procedureName);

      if (isProcedureSchema(procedure)) {
        procedurePathArr.pop();

        const procedurePath: string = [...procedurePathArr, procedureName].join(
          '/'
        );

        (this.methods as ApiBuilderMapAbstraction)[procedureName] =
          this.methodFactory(procedurePath);
      } else {
        (this.methods as ApiBuilderMapAbstraction)[procedureName] = {};

        this.makeBuilder(this.methods[procedureName] as any, procedurePathArr);

        procedurePathArr.pop();
      }
    }
  }

  protected abstract methodFactory(
    methodPathName: string
  ): MethodBuilderReturn<any, any>;
}
