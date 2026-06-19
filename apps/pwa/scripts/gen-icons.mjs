#!/usr/bin/env node
/**
 * Generate PNG icons from the SVG source. Requires `sharp` (devDependency).
 * Run: node scripts/gen-icons.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const svgPath = join(here, '..', 'public', 'icons', 'icon.svg');
const outDir = join(here, '..', 'public', 'icons');

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('Install sharp first: pnpm add -D sharp');
    process.exit(1);
  }
  const svg = await readFile(svgPath);
  const sizes = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'icon-maskable-512.png', size: 512 },
  ];
  for (const { name, size } of sizes) {
    const png = await sharp(svg).resize(size, size).png().toBuffer();
    await writeFile(join(outDir, name), png);
    console.log('wrote', name);
  }
}

main();
