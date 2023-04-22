import { IncomingMessage } from 'node:http';
import { AcceptPromise } from '../../../core';
import { ServerConfig } from '../../server.types';

export type WebSocketServerConfig = ServerConfig<
  (req: IncomingMessage) => AcceptPromise<void>
> & {
  pingInterval?: number;
  callTimeout?: number;
};

export interface ProcedureWaitingCallback {
  expireAt: number;
  resolve: WeakRef<(input: object) => void>;
  reject: WeakRef<(error: Error) => void>;
}

export type ClientId = string;
export type CallId = number;

export type ReponseCallbackKey = `${ClientId}__${CallId}`;

export type ResponseCallbacksMap = Map<
  ReponseCallbackKey,
  ProcedureWaitingCallback
>;
