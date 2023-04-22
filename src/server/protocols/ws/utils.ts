import { CallId, ClientId, ReponseCallbackKey } from './types';

export function getResponseCallbackKey(
  clientId: ClientId,
  callId: CallId
): ReponseCallbackKey {
  return `${clientId}__${callId}` as ReponseCallbackKey;
}

export function separateCallbackKey(
  callbackKey: ReponseCallbackKey
): [ClientId, CallId] {
  return callbackKey.split('__') as [ClientId, CallId];
}
