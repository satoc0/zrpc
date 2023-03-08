import { ApiCommandSchemas, ApiCommandsMap } from './api-definition';
import { decodeCommand, encodeCommand } from './packet-parsers';

export class ZCommandData {
  static factoryCommandDataMap(
    commandsMap: ApiCommandsMap
  ): Map<string, ZCommandData> {
    const map = new Map();

    Object.entries(commandsMap).forEach(([commandName, schemas]) => {
      const commandDataIntance = new ZCommandData(commandName, schemas);
      map.set(commandName, commandDataIntance);
    });

    return map;
  }

  constructor(private _name: string, private schemas: ApiCommandSchemas) {}

  get name(): string {
    return this._name;
  }

  encodeInput(data: object): Uint8Array {
    return encodeCommand(this.schemas.input, data);
  }

  decodeInput(buffer: Buffer): object {
    return decodeCommand(this.schemas.input, buffer);
  }

  encodeOutput(data: object): Uint8Array {
    return encodeCommand(this.schemas.output, data);
  }

  decodeOutput(buffer: Buffer): object {
    return decodeCommand(this.schemas.output, buffer);
  }
}
