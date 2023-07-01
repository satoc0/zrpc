import { ApiBuilderBase } from '../core/builder/api-builder-base';
import { ProcedureNotFoundError } from '../core/core-errors';
import { ZRPC } from '../zrpc';
import {
  ProcedureExecutor,
  ProcedureHandlerFunction,
} from '../core/procedures/procedure-executor';

export class ServerApiBuilder<
  ZAPI extends ZRPC,
  ConstructorMap extends Record<string, any>
> extends ApiBuilderBase<ConstructorMap> {
  private handlers: Map<string, ProcedureExecutor<any, any>> = new Map();

  constructor(private def: ZAPI) {
    super(def);
  }

  protected methodFactory(procedurePath: string): (handler: any) => any {
    return (handler: ProcedureHandlerFunction<any, any>) => {
      this.handlers.set(
        procedurePath,
        new ProcedureExecutor<any, any>(procedurePath as string, handler)
      );
    };
  }

  public get(procedurePath: string) {
    const handler = this.handlers.get(procedurePath);

    if (!handler) {
      throw new ProcedureNotFoundError(procedurePath);
    }

    return handler;
  }
}
