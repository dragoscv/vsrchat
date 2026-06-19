import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['cjs'],
  target: 'node18',
  platform: 'node',
  clean: true,
  sourcemap: true,
  // vscode is provided by the host at runtime; everything else is bundled.
  external: ['vscode'],
  noExternal: [/@vsrchat\//, 'ws', 'qrcode', 'zod', '@noble/curves', '@noble/hashes'],
});
