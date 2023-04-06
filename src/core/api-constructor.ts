import { ApiProceduresMap, ApiProceduresSchemas } from './api-definition';
import { isProcedureSchema } from './procedure-data';

export type ApiConstructorMapAbstraction<
  Root extends ApiProceduresMap = ApiProceduresMap
> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? unknown
    : Root[Key] extends ApiProceduresMap
    ? ApiConstructorMapAbstraction<Root[Key]>
    : object;
};

export abstract class ApiConstructor {
  protected abstract readonly structor: ApiConstructorMapAbstraction;

  protected buildStructor(
    structor: ApiConstructorMapAbstraction,
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

        structor[procedureName] = this.methodStructor(procedurePath);
      } else {
        structor[procedureName] = {};

        this.buildStructor(
          structor[procedureName] as any,
          procedure,
          procedurePathArr
        );

        procedurePathArr.pop();
      }
    }
  }

  protected abstract methodStructor(
    methodPathName: string
  ): (input: unknown) => unknown;
}
