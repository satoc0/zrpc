import {
  HTTP_ERROR_STATUS_CODE,
  PROTOBUF_CONTENT_TYPE,
} from '../core/constants';
import { ZError } from '../core/core-errors';
import { ZProcedureDataParser } from '../core/procedure-data';
import { Buffer } from 'buffer';

export class ZClientRequest {
  private static requiredHeaders: HeadersInit = {
    'content-type': PROTOBUF_CONTENT_TYPE,
    accept: `${PROTOBUF_CONTENT_TYPE}, application/json`,
  };

  constructor(
    private procedureData: ZProcedureDataParser,
    private rawInput: object
  ) {}

  async fetch(baseRrl: string, requestBase?: RequestInit): Promise<object> {
    const headers: HeadersInit = this.buildRequestHeaders(requestBase);

    const response = await fetch(
      baseRrl + '/' + this.procedureData.procedurePathName,
      {
        ...requestBase,
        headers,
        method: 'POST',
        body: this.procedureData.input.encode(this.rawInput),
      }
    );

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
    const responseType = response.headers.get('content-type');

    if (!responseType) {
      throw new Error('Response content-type not specified');
    }

    switch (responseType) {
      case 'application/json':
        return response.json();
      case PROTOBUF_CONTENT_TYPE:
        return this.decodeProtoResponse(response);
      default:
        throw new Error('Unhandled response content-type');
    }
  }

  private async decodeProtoResponse(response: Response): Promise<object> {
    const arrBuffer = await response.arrayBuffer();
    const outputBuffer = Buffer.from(arrBuffer);

    if (response.status === HTTP_ERROR_STATUS_CODE) {
      const zErrorMessage = ZError.schema.decode(outputBuffer).toJSON();

      return zErrorMessage;
    }

    const outputDecodedData = this.procedureData.output.decode(outputBuffer);

    return outputDecodedData;
  }
}
