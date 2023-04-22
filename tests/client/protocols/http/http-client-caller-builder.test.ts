import ZRPC, { ClientHttpConfig } from '../../../../src';
import { HttpClientCallerBuilder } from '../../../../src/client/protocols/http/http-client-caller-builder';
import { HttpClientRequest } from '../../../../src/client/protocols/http/http-client-request';
import { PROTOBUF_CONTENT_TYPE } from '../../../../src/core/constants';

describe('http-client-caller-builder', () => {
  const api = new ZRPC({
    procedures: {
      mockedCall: {
        input: {
          value: 'string',
        },
        output: {
          value: 'string',
        },
      },
    },
  });

  it('should correctly make http call', async () => {
    const methodFactorySpy = jest.spyOn(
      HttpClientCallerBuilder.prototype as any,
      'methodFactory'
    );

    const dataParser = api.proceduresDataParsers.get('mockedCall');

    const input = dataParser.output.encode({ value: 'string' });

    const config: ClientHttpConfig = {
      url: '/',
      fetchClient: jest.fn(async () => {
        return new Response(input, {
          headers: {
            'content-type': PROTOBUF_CONTENT_TYPE,
          },
        });
      }),
    };

    const caller = new HttpClientCallerBuilder(api, config);

    expect(methodFactorySpy).toHaveBeenCalledTimes(1);

    await caller.methods.mockedCall({ value: 'string' });

    expect(config.fetchClient).toHaveBeenCalledTimes(1);

    methodFactorySpy.mockReset();
    methodFactorySpy.mockRestore();
  });

  it('should correctly make http call with request custom properties', async () => {
    const methodFactorySpy = jest.spyOn(
      HttpClientCallerBuilder.prototype as any,
      'methodFactory'
    );
    const httpClientRequestFetchSpy = jest.spyOn(
      HttpClientRequest.prototype as any,
      'fetch'
    );

    const dataParser = api.proceduresDataParsers.get('mockedCall');

    const input = dataParser.output.encode({ value: 'string' });
    const requestInit: RequestInit = {
      keepalive: true,
      method: 'PUT',
    };

    const config: ClientHttpConfig = {
      requestBuilder: jest.fn(() => {
        return requestInit;
      }),
      fetchClient: jest.fn(async () => {
        return new Response(input, {
          headers: {
            'content-type': PROTOBUF_CONTENT_TYPE,
          },
        });
      }),
    };

    const caller = new HttpClientCallerBuilder(api, config);

    expect(methodFactorySpy).toHaveBeenCalledTimes(1);

    await caller.methods.mockedCall({ value: 'string' });

    expect(httpClientRequestFetchSpy).toBeCalledWith(requestInit);

    expect(config.requestBuilder).toHaveBeenCalledTimes(1);

    methodFactorySpy.mockReset();
    methodFactorySpy.mockRestore();
    httpClientRequestFetchSpy.mockReset();
    httpClientRequestFetchSpy.mockRestore();
  });
});
