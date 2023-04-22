import { IncomingMessage, ServerResponse } from 'http';
import { AcceptPromise } from '../../../core';
import { ServerConfig } from '../../server.types';

export type HttpServerConfig = ServerConfig<
  (
    req: IncomingMessage,
    res: ServerResponse<IncomingMessage>
  ) => AcceptPromise<void>
> & {
  baseUrl?: string;
};
