import { ZRPC } from '../../zrpc';
import { ApiProceduresMap, ApiProceduresSchemas } from '../api-definition';
import { isProcedureSchema } from '../procedures/procedure-data';

export type ApiBuilderMapAbstraction<
  Root extends ApiProceduresMap = ApiProceduresMap
> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? unknown
    : Root[Key] extends ApiProceduresMap
    ? ApiBuilderMapAbstraction<Root[Key]>
    : object;
};

export type MethodBuilderReturn<I = unknown, O = unknown> = (input: I) => O;

export abstract class ApiBuilderBase<
  BuilderMap extends ApiBuilderMapAbstraction = ApiBuilderMapAbstraction
> {
  public readonly methods: BuilderMap = {} as BuilderMap;

  constructor(protected api: ZRPC) {
    this.makeBuilder(api.apiDefinition.procedures);
  }

  protected makeBuilder(
    map: ApiProceduresMap,
    procedurePathArr: string[] = []
  ) {
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
