/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  // splitting: true,
  bundle: true,
  sourcemap: true,
  clean: true,
  platform: 'browser',
});
