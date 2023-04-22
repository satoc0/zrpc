import {
  Field,
  ProcedureDataSide,
  Schema,
  SchemaBase,
} from '../../../src/core';
import { ParserDataError } from '../../../src/core/core-errors';
import { ZProceduresDataParsers } from '../../../src/core/procedures/procedure-data';

const inputString = 'teste';
const outputString = inputString + '_res';

interface MetadataDescriptor {
  procedureName: string;
  dataParsers: ZProceduresDataParsers;
}

function createTest(
  groupTitle: string,
  metadataConstructor: () => MetadataDescriptor
) {
  describe(groupTitle, () => {
    const { procedureName, dataParsers } = metadataConstructor();

    it('should create procedure data parser map', () => {
      const procedure = dataParsers.get(procedureName);

      expect(procedure).toBeDefined();
    });

    it('should throw unexistent procedure', () => {
      expect(() => dataParsers.get('unexistent')).toThrow();
    });

    it('should encode/decode', () => {
      const procedure = dataParsers.get(procedureName);

      const inputObj = { str: inputString };
      const outputObj = { str: outputString };

      const encodedInput = procedure.input.encode(inputObj);
      const encodedOutput = procedure.output.encode(outputObj);

      expect(encodedInput).toBeInstanceOf(Uint8Array);
      expect(encodedOutput).toBeInstanceOf(Uint8Array);

      const decodedInput = procedure.input.decode(Buffer.from(encodedInput));
      const decodedOutput = procedure.input.decode(Buffer.from(encodedOutput));

      expect(decodedInput).toEqual(inputObj);
      expect(decodedOutput).toEqual(outputObj);
    });

    it('should throw in encode/decode', () => {
      const procedure = dataParsers.get(procedureName);

      const invalidBuffer = false as unknown as any;

      function inputEncode() {
        procedure.input.encode({ str: 2 });
      }

      function inputDecode() {
        procedure.input.decode(invalidBuffer);
      }

      function outputEncode() {
        procedure.output.encode({ str: 2 });
      }

      function outputDecode() {
        procedure.output.decode(invalidBuffer);
      }
      expect(() => outputDecode()).toThrow(ParserDataError);

      expect(() => inputEncode()).toThrow(ParserDataError);
      expect(() => inputDecode()).toThrow(ParserDataError);
      expect(() => outputEncode()).toThrow(ParserDataError);

      try {
        inputEncode();
      } catch (e) {
        const error = e as ParserDataError;
        expect(error).toBeInstanceOf(ParserDataError);
        expect(error.procedureName).toBe(procedureName);
        expect(error.errorCode).toBe('parser-encode');
        expect(error.side).toBe(ProcedureDataSide.Input);
      }

      try {
        outputEncode();
      } catch (e) {
        const error = e as ParserDataError;
        expect(error).toBeInstanceOf(ParserDataError);
        expect(error.procedureName).toBe(procedureName);
        expect(error.errorCode).toBe('parser-encode');
        expect(error.side).toBe(ProcedureDataSide.Output);
      }

      try {
        inputDecode();
      } catch (e) {
        const error = e as ParserDataError;

        expect(error).toBeInstanceOf(ParserDataError);
        expect(error.procedureName).toBe(procedureName);
        expect(error.errorCode).toBe('parser-decode');
        expect(error.side).toBe(ProcedureDataSide.Input);
      }

      try {
        outputDecode();
      } catch (e) {
        const error = e as ParserDataError;
        expect(error).toBeInstanceOf(ParserDataError);
        expect(error.procedureName).toBe(procedureName);
        expect(error.errorCode).toBe('parser-decode');
        expect(error.side).toBe(ProcedureDataSide.Output);
      }
    });
  });
}

createTest('procedure data parsers with json', () => ({
  procedureName: 'jsonDefinitionTest',
  dataParsers: new ZProceduresDataParsers({
    jsonDefinitionTest: {
      input: {
        str: 'string',
      },
      output: {
        str: 'string',
      },
    },
  }),
}));

@Schema('DecoratorInput')
export class DecoratorInput extends SchemaBase<DecoratorInput> {
  @Field('string')
  public str!: string;
}

@Schema('DecoratorOutput')
export class DecoratorOutput extends SchemaBase<DecoratorOutput> {
  @Field('string')
  public str!: string;
}

createTest('procedure data parsers with class decorators', () => ({
  procedureName: 'decoratorsDefinitionTest',
  dataParsers: new ZProceduresDataParsers({
    decoratorsDefinitionTest: {
      input: DecoratorInput,
      output: DecoratorOutput,
    },
  }),
}));
