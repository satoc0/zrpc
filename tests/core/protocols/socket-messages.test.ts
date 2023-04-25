import {
  SocketMessage,
  SocketMessageSerializer,
  SocketMessageType,
} from '../../../src/core/protocols/socket-messages-serializer';

describe('socket-messages', () => {
  it('should encode/decode correctly', () => {
    const messageType = SocketMessageType.Call;
    const callId = 1;
    const procedureName = 'procedureName';
    const bufferStringData = 'bufferStringData';
    const message: SocketMessage = {
      messageType,
      callId,
      procedureName,
      dataBuffer: Buffer.from(bufferStringData),
    };
    const messageTypeByteLenght = 1;
    const callIdByteLength = 1;
    const procedureNameByteLength = 1;
    const procedureNameStringByteLength = Buffer.from(procedureName).byteLength;
    const totalByteLengthExpected =
      messageTypeByteLenght +
      callIdByteLength +
      procedureNameByteLength +
      procedureNameStringByteLength +
      message.dataBuffer.byteLength;

    const messageBuffer = SocketMessageSerializer.encode(message);

    expect(messageBuffer).toBeInstanceOf(Buffer);
    expect(messageBuffer.byteLength).toBe(totalByteLengthExpected);

    const messageDecoded = SocketMessageSerializer.decode(messageBuffer);

    expect(Buffer.from(messageDecoded.dataBuffer).toString()).toBe(
      bufferStringData
    );

    expect(messageDecoded).toEqual(message);
  });
});
