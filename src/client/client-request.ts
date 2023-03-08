import { ZCommandData } from '../core/command-data';

export class ZClientRequest {
  private static requiredHeaders: HeadersInit = {
    'content-type': 'application/protobuf',
  };

  constructor(private commandData: ZCommandData, private rawInput: object) {}

  async fetch(baseRrl: string, requestBase?: RequestInit): Promise<object> {
    const headers: HeadersInit = this.buildRequestHeaders(requestBase);

    const response = await fetch(baseRrl + '/' + this.commandData.name, {
      ...requestBase,
      headers,
      method: 'POST',
      body: this.commandData.encodeInput(this.rawInput),
    });

    return this.handleResponse(response);
  }

  private buildRequestHeaders(requestBase?: RequestInit) {
    const additionalHeaders: HeadersInit | undefined = Array.isArray(
      requestBase?.headers
    )
      ? ((requestBase as RequestInit).headers as [string, string][]).reduce(
          (result, [key, value]) => {
            result[key] = value;
            return result;
          },
          {} as Record<string, string>
        )
      : requestBase?.headers;

    return {
      ...additionalHeaders,
      ...ZClientRequest.requiredHeaders,
    };
  }

  private handleResponse(response: Response): Promise<object> {
    return this.decodeResponse(response);
  }

  private async decodeResponse(response: Response): Promise<object> {
    const responseBlob = await response.blob();
    const arrBuffer = await responseBlob.arrayBuffer();
    const outputBuffer = Buffer.from(arrBuffer);
    const outputDecodedData = this.commandData.decodeOutput(outputBuffer);

    return outputDecodedData;
  }
}
