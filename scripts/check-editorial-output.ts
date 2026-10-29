// Run against the final deployment artifact, including Worker chunks and source maps.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  loadContent,
  resolveContentAssets,
  walkContent,
  type ContentAsset,
} from '../src/lib/editorial/content.ts';
import { articleUrl } from '../src/lib/editorial/model.ts';
const root = path.resolve('content/editorial');
const entries = loadContent(root, true);
const publishedAssets = new Map<string, ContentAsset>();
const draftAssets = new Map<string, ContentAsset>();
for (const entry of entries)
  resolveContentAssets(
    entry,
    root,
    entry.article.status === 'published' ? publishedAssets : draftAssets,
  );
const privateUrls = [...draftAssets.keys()].filter((url) => !publishedAssets.has(url));
const privatePaths = entries
  .filter((entry) => entry.article.status === 'draft')
  .map((entry) => articleUrl(entry.article));
// Wrangler's local simulator records requested URLs here after smoke tests.
// This state is neither a Worker module nor a public deployment asset.
const localState = path.resolve('dist/server/.wrangler') + path.sep;
const files = walkContent(path.resolve('dist')).filter((file) => !file.startsWith(localState));
assert.ok(files.length, 'Build the site before checking editorial output');
for (const file of files) {
  const bytes = readFileSync(file);
  const content = bytes.toString('utf8');
  for (const url of privateUrls) {
    assert.ok(
      !file.endsWith(url) && !content.includes(url),
      `Draft resource leaked into ${file}: ${url}`,
    );
  }
  for (const url of privatePaths)
    assert.ok(!content.includes(url), `Draft URL leaked into ${file}: ${url}`);
}
console.log(
  `Editorial privacy passed: ${privatePaths.length} draft routes and ${privateUrls.length} exclusive resources absent from ${files.length} deployment files.`,
);
