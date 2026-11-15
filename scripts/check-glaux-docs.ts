// Runs Glaux's own documentation checks through `mise` on every version of the catalog
// `pnpm docs:sync` wrote, each in a full checkout of its commit.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fetchDocs } from '../src/lib/glaux/checkout.ts';
import { readCatalog } from '../src/lib/glaux/versions.ts';

const root = path.resolve(import.meta.dirname, '..');

try {
  const catalog = readCatalog(path.join(root, 'content/glaux'));
  for (const { id, commit } of catalog.versions) {
    console.log(`docs:check: ${id} (${commit.slice(0, 10)})`);
    // The Rust validator needs the source and ROM too, so use a separate, full checkout.
    const source = path.join(root, '.cache/glaux-check', commit);
    fetchDocs({ repository: catalog.repository, commit }, source, false);
    const result = spawnSync('mise', ['run', 'docs-check'], { cwd: source, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
} catch (error) {
  console.error(`docs:check failed: ${(error as Error).message}`);
  process.exit(1);
}
