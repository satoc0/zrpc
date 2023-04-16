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

  constructor(api: ZRPC) {
    this.makeBuilder(this.methods, api.apiDefinition.procedures);
  }

  protected makeBuilder(
    builderMapTarget: ApiBuilderMapAbstraction,
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

        builderMapTarget[procedureName] = this.methodFactory(procedurePath);
      } else {
        builderMapTarget[procedureName] = {};

        this.makeBuilder(
          builderMapTarget[procedureName] as any,
          procedure,
          procedurePathArr
        );

        procedurePathArr.pop();
      }
    }
  }

  protected abstract methodFactory(methodPathName: string): MethodBuilderReturn;
}
