import ZRPC, { ZHttpClient } from '../../../../src';

describe('http-client', () => {
  const api = new ZRPC({
    procedures: {
      procedureMock: {
        input: { value: 'string' },
        output: { value: 'string' },
      },
    },
  });

  it('should create http-client instance', async () => {
    const httpClient = new ZHttpClient(api);

    expect(Object.keys(httpClient.call)).toHaveLength(1);
  });

  it('should update options', async () => {
    const initConfigs = {};

    const httpClient = new ZHttpClient(api, initConfigs);

    httpClient.updateConfig({
      url: 'asd/',
    });

    expect(initConfigs).toEqual({});
    expect(httpClient.getConfig().url).toBe('asd/');
    expect(httpClient.getConfig().fetchClient?.constructor.name).toBe(
      'AsyncFunction'
    );
  });
});
