import {
  Context,
  ProcedureExecutor,
} from '../../../src/core/procedures/procedure-executor';
import { ProcedureHandlerError } from '../../../src/server/server-errors';

class TestContext<T extends object> extends Context<T> {}

describe('procedure-executor', () => {
  it('should run successful procedure', async () => {
    const procedureName = 'procedureName';

    const input = { num: 2 };
    const handlerMock = jest.fn(({ input: { num } }) => ({ result: num * 2 }));

    const procedureExecutor = new ProcedureExecutor<
      { num: 'int32' },
      { result: 'int32' }
    >(procedureName, handlerMock);
    const context = new TestContext(input);
    await procedureExecutor.run(context);

    expect(handlerMock.mock.calls).toHaveLength(1);
    expect(handlerMock.mock.results[0].value).toEqual({ result: 2 * 2 });
  });

  it('should throw procedure error handle', async () => {
    const procedureName = 'procedureName';

    const input = { num: 2 };
    const errorMessage = 'errorMessage';
    const expectedError = new ProcedureHandlerError(
      procedureName,
      'Error',
      errorMessage
    );
    const handlerMock = jest.fn(() => {
      throw new Error(errorMessage);
    });

    const procedureExecutor = new ProcedureExecutor<
      { num: 'int32' },
      { result: 'int32' }
    >(procedureName, handlerMock);
    const context = new TestContext(input);
    procedureExecutor.run(context).catch((e) => {
      expect(e).toBeInstanceOf(ProcedureHandlerError);
      expect(e).toEqual(expectedError);
    });
  });
});
