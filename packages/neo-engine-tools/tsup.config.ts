import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/build/index.ts', 'src/cli/index.ts', 'src/cli/bin.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['@getneotap/neo-engine', 'vite'],
});
