import { ApiProceduresMap, ApiProceduresSchemas } from './api-definition';
import { isProcedureSchema } from './procedure-data';

export type ApiBuilderMapAbstraction<
  Root extends ApiProceduresMap = ApiProceduresMap
> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? unknown
    : Root[Key] extends ApiProceduresMap
    ? ApiBuilderMapAbstraction<Root[Key]>
    : object;
};

export abstract class ApiBuilderBase {
  protected abstract readonly methods: ApiBuilderMapAbstraction;

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

        builderMapTarget[procedureName] = this.methodBuilder(procedurePath);
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

  protected abstract methodBuilder(
    methodPathName: string
  ): (input: unknown) => unknown;
}
