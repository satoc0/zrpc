import { ApiConstructor } from '../core/api-constructor';
import { ProcedureNotFound } from '../core/core-errors';
import { ZRPC } from '../zrpc';
import { ProcedureExecutor } from './procedure-executor';
import { ProcedureHandlerFunction } from './server.types';

export class ServerApiConstructor<
  ZAPI extends ZRPC,
  ConstructorMap extends Record<string, any>
> extends ApiConstructor {
  private handlers: Map<string, ProcedureExecutor<any, any>> = new Map();

  public readonly methods: ConstructorMap = {} as ConstructorMap;

  constructor(private def: ZAPI) {
    super();
    this.buildStructor(this.methods, this.def.apiDefinition.procedures);
  }

  protected methodStructor(procedurePath: string): (handler: any) => any {
    return (handler: ProcedureHandlerFunction<any, any, any>) => {
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
