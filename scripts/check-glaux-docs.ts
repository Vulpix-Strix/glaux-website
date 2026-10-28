// Validate the pinned public revision, or an explicit GLAUX_DIR for local development.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fetchLockedDocs } from '../src/lib/glaux/checkout.ts';
import { LOCK_FILE } from '../src/lib/glaux/docs-source.ts';
import { readLock } from '../src/lib/glaux/lock.ts';

const root = path.resolve(import.meta.dirname, '..');

try {
  let source = process.env.GLAUX_DIR;
  if (!source) {
    // The Rust validator needs the source and ROM too, so use a separate, full checkout.
    source = path.join(root, '.cache/glaux-check');
    fetchLockedDocs(readLock(path.join(root, LOCK_FILE)), source, false);
  }
  const result = spawnSync('mise', ['run', 'docs-check'], { cwd: source, stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
} catch (error) {
  console.error(`docs:check failed: ${(error as Error).message}`);
  process.exit(1);
}
