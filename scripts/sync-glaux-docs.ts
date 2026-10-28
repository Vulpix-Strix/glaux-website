// Usage: node scripts/sync-glaux-docs.ts [--locked | --source <glaux docs dir>] [--out <dir>]
// Without options it reads ../glaux/docs (or GLAUX_DOCS_DIR). GLAUX_DOCS_LOCKED=1 is --locked.
import path from 'node:path';
import { resolveDocsSource } from '../src/lib/glaux/docs-source.ts';
import { syncDocs } from '../src/lib/glaux/sync.ts';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(name);
  return at < 0 ? undefined : args[at + 1];
};

try {
  const { docsDir, manifest: source, notices } = resolveDocsSource({
    root,
    source: option('--source'),
    locked: args.includes('--locked') ? true : undefined,
    env: process.env,
  });
  const out = path.resolve(root, option('--out') ?? 'content/glaux');
  for (const notice of notices) console.warn(`warning: ${notice}`);

  const manifest = syncDocs(docsDir, out, { source });
  const origin = source.kind === 'locked' ? `locked commit ${source.commit}` : docsDir;
  for (const [lang, pages] of Object.entries(manifest.languages)) {
    console.log(`${lang}: ${Object.keys(pages).length} pages from ${origin} -> ${out}`);
    const missing = manifest.missing[lang] ?? [];
    if (missing.length > 0) console.warn(`warning: ${lang} has no translation for ${missing.length} page(s): ${missing.join(', ')}`);
  }
} catch (error) {
  console.error(`docs:sync failed: ${(error as Error).message}`);
  process.exit(1);
}
