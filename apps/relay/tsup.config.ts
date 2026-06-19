import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['cjs'],
  target: 'node22',
  platform: 'node',
  clean: true,
  sourcemap: true,
  // Bundle ALL dependencies so the Docker runtime image is self-contained
  // (the runtime stage copies only dist/, no node_modules).
  noExternal: [/.*/],
});
