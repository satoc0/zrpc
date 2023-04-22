import { ClientHttpConfig } from '../../../../src';
import { HttpClientRequest } from '../../../../src/client/protocols/http/http-client-request';
import {
  HTTP_ERROR_STATUS_CODE,
  PROTOBUF_CONTENT_TYPE,
} from '../../../../src/core/constants';
import { ZError } from '../../../../src/core/core-errors';
import { ZProcedureDataSerializer } from '../../../../src/core/procedures/procedure-data';

function createConfig(response: Response): ClientHttpConfig {
  return {
    url: '/',
    fetchClient: jest.fn(async () => {
      return response;
    }),
  };
}

describe('http-client-request', () => {
  const procedureName = 'testProcedureName';
  const dataSerializer = new ZProcedureDataSerializer(procedureName, {
    input: { numb: 'uint32' },
    output: { numb: 'uint32' },
  });

  it('should change base url', async () => {
    const input = { numb: 2 };
    const procedureResponse = dataSerializer.output.encode(input);
    const config: ClientHttpConfig = createConfig(
      new Response(procedureResponse, {
        headers: [['content-type', PROTOBUF_CONTENT_TYPE]],
      })
    );
    const request = new HttpClientRequest(config, dataSerializer, input);
    const fetchClientMock = config.fetchClient as jest.Mock;
    await request.fetch();

    expect(fetchClientMock.mock.calls[0][0]).toBe('/' + procedureName);
  });

  it('should correctly handle protobuf response type', async () => {
    const input = { numb: 2 };
    const procedureResponse = dataSerializer.output.encode(input);

    const response = new Response(procedureResponse, {
      headers: [['content-type', PROTOBUF_CONTENT_TYPE]],
    });
    const config: ClientHttpConfig = createConfig(response);
    const request = new HttpClientRequest(config, dataSerializer, input);

    const decodeSpy = jest.spyOn(request, 'decodeProtoResponse' as any);

    const result = await request.fetch();

    expect(decodeSpy.mock.calls).toHaveLength(1);
    expect(decodeSpy).toHaveBeenCalledWith(response);
    expect(result).toEqual(input);
  });

  it('should correctly handle JSON response type', async () => {
    const input = { numb: 2 };

    const response = new Response(Buffer.from(JSON.stringify(input)), {
      headers: [['content-type', 'application/json']],
    });
    const config: ClientHttpConfig = createConfig(response);
    const request = new HttpClientRequest(config, dataSerializer, input);

    const decodeSpy = jest.spyOn(response, 'json');

    const result = await request.fetch();

    expect(decodeSpy.mock.calls).toHaveLength(1);
    expect(result).toEqual(input);
  });

  it('should sent with custom headers as arrays', async () => {
    const input = { numb: 2 };
    const customHeaderName = 'custom-header-name';
    const customHeaderValue = 'custom-header-value';
    const procedureResponse = dataSerializer.output.encode(input);

    const response = new Response(procedureResponse, {
      headers: [['content-type', PROTOBUF_CONTENT_TYPE]],
    });
    const config: ClientHttpConfig = createConfig(response);
    const request = new HttpClientRequest(config, dataSerializer, input);

    const fetchSpy = jest.spyOn(request, 'fetch' as any);
    const fetchClientMock = config.fetchClient as jest.Mock;

    await request.fetch({
      headers: [[customHeaderName, customHeaderValue]],
    });

    expect(fetchSpy.mock.calls).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledWith({
      headers: [[customHeaderName, customHeaderValue]],
    });
    expect(fetchClientMock.mock.calls[0][0]).toBe(`/${procedureName}`);

    expect(fetchClientMock.mock.calls[0][1].headers[customHeaderName]).toBe(
      customHeaderValue
    );
  });

  it('should sent with custom headers as objects', async () => {
    const input = { numb: 2 };
    const customHeaderName = 'custom-header-name';
    const customHeaderValue = 'custom-header-value';
    const procedureResponse = dataSerializer.output.encode(input);

    const response = new Response(procedureResponse, {
      headers: [['content-type', PROTOBUF_CONTENT_TYPE]],
    });
    const config: ClientHttpConfig = createConfig(response);
    const request = new HttpClientRequest(config, dataSerializer, input);

    const fetchSpy = jest.spyOn(request, 'fetch' as any);
    const fetchClientMock = config.fetchClient as jest.Mock;

    await request.fetch({
      headers: { [customHeaderName]: customHeaderValue },
    });

    expect(fetchSpy.mock.calls).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledWith({
      headers: { [customHeaderName]: customHeaderValue },
    });
    expect(fetchClientMock.mock.calls[0][0]).toBe(`/${procedureName}`);

    expect(fetchClientMock.mock.calls[0][1].headers[customHeaderName]).toBe(
      customHeaderValue
    );
  });

  it('should handle response error', async () => {
    const input = { numb: 2 };
    const errorObject = {
      isZError: true,
      errorCode: 'customErrorCode',
      message: 'customMessage',
      procedureName: 'customProcedureName',
      auxData: 'customAuxData',
    };
    const procedureResponseError = ZError.factory(errorObject);

    const response = new Response(procedureResponseError.getResponseBuffer(), {
      status: HTTP_ERROR_STATUS_CODE,
      headers: [['content-type', PROTOBUF_CONTENT_TYPE]],
    });
    const config: ClientHttpConfig = createConfig(response);
    const request = new HttpClientRequest(config, dataSerializer, input);

    const decodeSpy = jest.spyOn(request, 'decodeProtoResponse' as any);

    const result = await request.fetch();

    expect(decodeSpy.mock.calls).toHaveLength(1);
    expect(decodeSpy).toHaveBeenCalledWith(response);
    expect(result).toEqual(errorObject);
  });

  it('should throw content-type not specified', async () => {
    const input = { numb: 2 };
    const config: ClientHttpConfig = createConfig(
      new Response(new ArrayBuffer(1))
    );
    const request = new HttpClientRequest(config, dataSerializer, input);

    await expect(() => request.fetch()).rejects.toThrow(
      new Error('Response content-type not specified')
    );
  });

  it('should throw unhandled content-type', async () => {
    const input = { numb: 2 };
    const config: ClientHttpConfig = createConfig(
      new Response(new ArrayBuffer(1), {
        headers: { 'content-type': 'not-handled' },
      })
    );
    const request = new HttpClientRequest(config, dataSerializer, input);

    await expect(() => request.fetch()).rejects.toThrow(
      new Error('Unhandled response content-type')
    );
  });
});
