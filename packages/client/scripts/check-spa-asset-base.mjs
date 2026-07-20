/**
 * Guard against Vite `base: './'` (or other relative bases).
 * Relative asset URLs break deep links like /room/:code: the browser requests
 * /room/assets/*.js, Vercel returns index.html (text/html), and the page stays blank.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const indexPath = path.resolve(root, '../dist/index.html');
const html = fs.readFileSync(indexPath, 'utf8');

const relativeAsset = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)].map((m) => m[1]);

if (relativeAsset.length > 0) {
  console.error(
    'SPA asset base check failed: dist/index.html uses relative URLs that break /room/:code deep links:',
  );
  for (const ref of relativeAsset) console.error(`  ${ref}`);
  console.error('Set vite.config.ts `base: \'/\'` (Vite default) so assets resolve from the site root.');
  process.exit(1);
}

console.log('SPA asset base check passed (no relative ./ asset URLs in dist/index.html).');
