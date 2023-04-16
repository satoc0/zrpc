import {
  ApiProceduresMap,
  ApiProceduresSchemas,
} from '../../../core/api-definition';
import {
  ApiBuilderBase,
  MethodBuilderReturn,
} from '../../../core/builder/api-builder-base';
import { SchemaToType } from '../../../core/schema-types';
import { ZRPC } from '../../../zrpc';
import { ZClientWSConfig } from './ws-client-types';
import { ZSocket } from './ws-socket';

export type ApiBuilderMap<Root extends ApiProceduresMap = ApiProceduresMap> = {
  [Key in keyof Root]: Root[Key] extends ApiProceduresSchemas
    ? (
        input: SchemaToType<Root[Key]['input']>
      ) => Promise<SchemaToType<Root[Key]['output']>>
    : Root[Key] extends ApiProceduresMap
    ? ApiBuilderMap<Root[Key]>
    : never;
};

export class WsClientCallerBuilder<
  ZAPI extends ZRPC,
  Procedures extends ApiProceduresMap = ZAPI['apiDefinition']['procedures']
> extends ApiBuilderBase<ApiBuilderMap<Procedures>> {
  constructor(
    protected api: ZAPI,
    private socket: ZSocket,
    private config: ZClientWSConfig
  ) {
    super(api);
  }

  protected methodFactory(
    procedurePath: string
  ): MethodBuilderReturn<any, Promise<any>> {
    return async (input) => {
      return new Promise((resolve, reject) => {
        const callId = this.socket.callRemoteProcedure(procedurePath, input);
        const tm = setTimeout(() => {
          reject(
            new Error(
              `Call timeout, procedure: ${procedurePath}, call id: ${callId}`
            )
          );
        }, this.config.responseTimeout);

        this.socket.waitCallResponse(callId, (err, output) => {
          clearTimeout(tm);

          if (err) {
            reject(err);
          } else {
            resolve(output);
          }
        });
      });
    };
  }
}
