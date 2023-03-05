import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '(.*).ts$': [
      'ts-jest',
      {
        tsconfig: `tsconfig.jest.json`,
      },
    ],
  },
};

export default config;
