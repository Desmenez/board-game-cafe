/**
 * Render public/favicon.svg → assets/icon-only.png (+ icon.png)
 * for @capacitor/assets Android icon generation.
 */
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const SIZE = 1024;
const PADDING_RATIO = 0.12; // ~12% padding for adaptive-icon safe zone
const BACKGROUND = '#FFFFFF';

const svgPath = path.join(root, 'public', 'favicon.svg');
const outDir = path.join(root, 'assets');

await mkdir(outDir, { recursive: true });

const svg = await readFile(svgPath);
const contentSize = Math.round(SIZE * (1 - 2 * PADDING_RATIO));

const dice = await sharp(svg, { density: 384 })
  .resize(contentSize, contentSize, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

const composite = await sharp({
  create: {
    width: SIZE,
    height: SIZE,
    channels: 4,
    background: BACKGROUND,
  },
})
  .composite([{ input: dice, gravity: 'centre' }])
  .png()
  .toBuffer();

const iconOnly = path.join(outDir, 'icon-only.png');
const icon = path.join(outDir, 'icon.png');
await sharp(composite).toFile(iconOnly);
await sharp(composite).toFile(icon);

console.log(`Wrote ${iconOnly} and ${icon} (${SIZE}×${SIZE}, bg ${BACKGROUND}, pad ${PADDING_RATIO * 100}%)`);
