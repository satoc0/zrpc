import { CallId, ClientId, ReponseCallbackKey } from './types';

const CALLBACK_KEY_SEPARATOR = '__';

export function getCallbackKey(
  clientId: ClientId,
  callId: CallId
): ReponseCallbackKey {
  return `${clientId}${CALLBACK_KEY_SEPARATOR}${callId}` as ReponseCallbackKey;
}

export function separateCallbackKey(
  callbackKey: ReponseCallbackKey
): [ClientId, CallId] {
  return callbackKey.split(CALLBACK_KEY_SEPARATOR) as [ClientId, CallId];
}
