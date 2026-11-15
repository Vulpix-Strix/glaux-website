// Usage: node scripts/glaux-credits.ts
// Writes the Glaux credits of public/credits/ from the commit of the documentation version the
// site shows, as listed in the catalog `pnpm docs:sync` wrote.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { OUT_DIR, generateGlaux } from '../src/lib/credits/generate.ts';
import { fetchCredits } from '../src/lib/credits/glaux.ts';
import { defaultVersion, readCatalog } from '../src/lib/glaux/versions.ts';

const root = path.resolve(import.meta.dirname, '..');

try {
  const catalog = readCatalog(path.join(root, 'content/glaux'));
  const { id, commit } = defaultVersion(catalog);
  const glauxDir = fetchCredits({ repository: catalog.repository, commit }, path.join(root, '.cache/glaux-credits'));
  const files = generateGlaux(glauxDir, { repository: catalog.repository, commit, version: id });
  const out = path.join(root, OUT_DIR);
  mkdirSync(out, { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(path.join(out, name), text);
  console.log(`credits: wrote ${Object.keys(files).length} Glaux files for ${id} (${commit.slice(0, 10)}) to ${OUT_DIR}`);
} catch (error) {
  console.error(`credits:glaux failed: ${(error as Error).message}`);
  process.exit(1);
}
