// Usage: node scripts/sync-glaux-docs.ts
// Discovers the published Glaux releases and the development branch on GitHub, and writes the
// documentation of each one, with the catalog of versions, to content/glaux/. GITHUB_TOKEN, when
// set, is sent to the GitHub API to raise its rate limit.
import path from 'node:path';
import { GLAUX_REPOSITORY, discoverVersions, listReleases, syncVersions } from '../src/lib/glaux/versions.ts';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'content/glaux');

try {
  const catalog = discoverVersions(GLAUX_REPOSITORY, await listReleases(GLAUX_REPOSITORY, process.env.GITHUB_TOKEN));
  const manifests = syncVersions(catalog, path.join(root, '.cache/glaux-source'), out);
  for (const version of catalog.versions) {
    const marker = version.id === catalog.default ? ' (default)' : '';
    console.log(`${version.id}${marker}: ${version.kind} at ${version.commit}`);
    for (const [lang, pages] of Object.entries(manifests[version.id].languages)) {
      console.log(`  ${lang}: ${Object.keys(pages).length} pages`);
      const missing = manifests[version.id].missing[lang] ?? [];
      if (missing.length > 0) console.warn(`  warning: ${lang} has no translation for ${missing.length} page(s): ${missing.join(', ')}`);
    }
  }
  console.log(`-> ${path.relative(root, out)}`);
} catch (error) {
  console.error(`docs:sync failed: ${(error as Error).message}`);
  process.exit(1);
}
