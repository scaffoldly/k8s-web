import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  esbuildOptions(options) {
    // Keep class names for Angular DI
    options.keepNames = true;
  },
  // Use SWC to preserve decorators
  esbuildPlugins: [],
  tsconfig: './tsconfig.json',
});
