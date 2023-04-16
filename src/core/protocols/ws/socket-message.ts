import { Buffer } from 'buffer';

export enum SocketMessageType {
  Call = 0,
  CallReponse = 1,
}

const MessageTypeBuffers: Record<SocketMessageType, Uint8Array> = {
  [SocketMessageType.Call]: new Uint8Array([0]),
  [SocketMessageType.CallReponse]: new Uint8Array([1]),
};

export enum PingPongMessage {
  Ping = 41,
  Pong = 42,
}

export const PING_BUFFER = new Uint8Array([PingPongMessage.Ping]);
export const PONG_BUFFER = new Uint8Array([PingPongMessage.Pong]);

/**
 * Used by standard bi-directional communication
 */
export function isPingOrPongBufferMessage(
  arrBuffer: ArrayBuffer
): PingPongMessage | false {
  if (arrBuffer.byteLength !== 1) return false;

  const arr = new Uint8Array(arrBuffer);
  const byteValue = arr.at(0);

  return (
    (byteValue === PingPongMessage.Ping ||
      byteValue === PingPongMessage.Pong) &&
    byteValue
  );
}

/**
 * One byte for packetType, one byte for callId and one byte for
 * procedure name length
 */
const PACKET_METADATA_BYTES_LENGTH = 3;
const MAX_PROCEDURE_BYTE_LENGTH = 255;

export interface SocketMessage {
  messageType: SocketMessageType;
  callId: number;
  procedureName: string;
  dataBuffer: Uint8Array;
}

function uint8Buffer(num: number): Buffer {
  const buffer = Buffer.alloc(1);
  buffer.writeUint8(num);
  return buffer;
}

/**
 * The structure of a binary packet is
 * ```
 * [typeByte, callId, procedureNameLengthByte, ...procedureNameBytes, ...dataBytes]
 * ```
 */
export class SocketMessageParser {
  static encode(packet: SocketMessage): Uint8Array {
    const { messageType, procedureName, dataBuffer } = packet;
    const typeByte = MessageTypeBuffers[messageType];

    const procedureNameBuffer = Buffer.from(procedureName);
    const procedureNameByteLength = procedureNameBuffer.byteLength;

    if (procedureNameByteLength > MAX_PROCEDURE_BYTE_LENGTH) {
      throw new RangeError(
        `Procedure name '${procedureName}' has exceeded the maximum allowed length of ${MAX_PROCEDURE_BYTE_LENGTH} bytes for a procedure path name.`
      );
    }

    const callIdByte = uint8Buffer(packet.callId);
    const procedureBytesLengthByte = uint8Buffer(procedureNameByteLength);

    return Buffer.concat([
      typeByte,
      callIdByte,
      procedureBytesLengthByte,
      dataBuffer,
    ]);
  }

  static decode(buffer: Buffer): SocketMessage {
    const messageType = buffer.readUint8(0);
    const callId = buffer.readUint8(1);
    const procedureNameLength = buffer.readUint8(2);

    const procedureNameBuffer = buffer.subarray(
      PACKET_METADATA_BYTES_LENGTH,
      procedureNameLength
    );
    const procedureName = procedureNameBuffer.toString();

    const dataBuffer = buffer.subarray(
      0,
      procedureNameLength + PACKET_METADATA_BYTES_LENGTH
    );

    return {
      messageType,
      callId,
      procedureName,
      dataBuffer,
    };
  }
}
