// Usage: node scripts/sync-credits.ts [--check] [--source <glaux dir>]
// Writes public/credits/ from the Glaux revision in glaux-docs.lock and from the installed npm
// packages. --check writes nothing and fails when the files are not what it would write.
// --source reads a local Glaux checkout instead of the locked revision, for development.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { LOCK_FILE } from '../src/lib/glaux/docs-source.ts';
import { localCommit } from '../src/lib/glaux/checkout.ts';
import { readLock } from '../src/lib/glaux/lock.ts';
import { OUT_DIR, generate } from '../src/lib/credits/generate.ts';
import { fetchLockedCredits } from '../src/lib/credits/glaux.ts';

const root = path.resolve(process.env.CREDITS_ROOT ?? path.join(import.meta.dirname, '..'));
const args = process.argv.slice(2);
const check = args.includes('--check');
const sourceAt = args.indexOf('--source');

try {
  if (check && sourceAt >= 0) throw new Error('--check always uses the locked Glaux revision, so it cannot take --source');
  const lock = readLock(path.join(root, LOCK_FILE));
  const glauxDir = sourceAt >= 0 ? path.resolve(args[sourceAt + 1]) : fetchLockedCredits(lock, path.join(root, '.cache/glaux-credits'));
  const commit = localCommit(glauxDir);
  if (sourceAt >= 0 && commit !== lock.commit) console.warn(`warning: ${glauxDir} is at ${commit?.slice(0, 10)} but ${LOCK_FILE} pins ${lock.commit.slice(0, 10)}; pnpm credits:check will not accept this output`);

  const files = generate(root, glauxDir, { repository: lock.repository, commit });
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
