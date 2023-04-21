export interface ProcedureResponseWait {
  expireAt: number;
  resolve: (input: object) => void;
  reject: (error: Error) => void;
}

export type ClientId = string;
export type CallId = number;

export type ReponseCallbackKey = `${ClientId}${CallId}`;

export type ResponseCallbacksMap = Map<
  ReponseCallbackKey,
  ProcedureResponseWait
>;
