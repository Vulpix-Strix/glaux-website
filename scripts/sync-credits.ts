// Usage: node scripts/sync-credits.ts [--check]
// Writes the npm credits of public/credits/ from the installed packages. --check writes nothing
// and fails when the files are not what it would write. The Glaux credits are written by
// `pnpm credits:glaux` during the build.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { OUT_DIR, generateNpm } from '../src/lib/credits/generate.ts';

const root = path.resolve(process.env.CREDITS_ROOT ?? path.join(import.meta.dirname, '..'));
const check = process.argv.includes('--check');

try {
  const files = generateNpm(root);
  const out = path.join(root, OUT_DIR);

  if (check) {
    const stale = Object.entries(files).filter(([name, text]) => !existsSync(path.join(out, name)) || readFileSync(path.join(out, name), 'utf8') !== text);
    if (stale.length) throw new Error(`${stale.map(([name]) => `${OUT_DIR}/${name}`).join(', ')} out of date. Run pnpm credits:sync and commit the result`);
    console.log(`credits: ${Object.keys(files).length} files are up to date`);
  } else {
    mkdirSync(out, { recursive: true });
    for (const [name, text] of Object.entries(files)) writeFileSync(path.join(out, name), text);
    console.log(`credits: wrote ${Object.keys(files).length} files to ${OUT_DIR}`);
  }
} catch (error) {
  console.error(`credits:${check ? 'check' : 'sync'} failed: ${(error as Error).message}`);
  process.exit(1);
}
