import { Buffer } from 'buffer';

export enum PacketType {
  Call = 0,
  CallReponse = 1,
}

const PacketTypeBuffers: Record<PacketType, Uint8Array> = {
  [PacketType.Call]: new Uint8Array([0x00]),
  [PacketType.CallReponse]: new Uint8Array([0x01]),
};

/**
 * One byte for packetType, one byte for callId and one byte for
 * procedure name length
 */
const PACKET_METADATA_BYTES_LENGTH = 3;
const MAX_PROCEDURE_BYTE_LENGTH = 255;

export interface Packet {
  packetType: PacketType;
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
export class BinaryPacketParser {
  static encode(packet: Packet): Uint8Array {
    const { packetType, procedureName, dataBuffer } = packet;
    const typeByte = PacketTypeBuffers[packetType];

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

  static decode(buffer: Buffer): Packet {
    const packetType = buffer.readUint8(0);
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
      packetType,
      callId,
      procedureName,
      dataBuffer,
    };
  }
}
