import { ApiBuilderBase } from '../core/builder/api-builder-base';
import { ProcedureNotFound } from '../core/core-errors';
import { ZRPC } from '../zrpc';
import {
  ProcedureExecutor,
  ProcedureHandlerFunction,
} from '../core/procedures/procedure-executor';

export class ServerApiBuilder<
  ZAPI extends ZRPC,
  ConstructorMap extends Record<string, any>
> extends ApiBuilderBase {
  private handlers: Map<string, ProcedureExecutor<any, any>> = new Map();

  public readonly methods: ConstructorMap = {} as ConstructorMap;

  constructor(private def: ZAPI) {
    super();
    this.makeBuilder(this.methods, this.def.apiDefinition.procedures);
  }

  protected methodBuilder(procedurePath: string): (handler: any) => any {
    return (handler: ProcedureHandlerFunction<any, any>) => {
      this.handlers.set(
        procedurePath,
        new ProcedureExecutor<any, any>(procedurePath as string, handler)
      );
    };
  }

  public getHandler(procedurePath: string) {
    const handler = this.handlers.get(procedurePath);

    if (!handler) {
      throw new ProcedureNotFound(procedurePath);
    }

    return handler;
  }
}
