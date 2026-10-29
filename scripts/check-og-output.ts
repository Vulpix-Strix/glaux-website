// Run against the final deployment artifact: every card a page points to must exist and be 1200x630.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { walkContent } from '../src/lib/editorial/content.ts';
import { collectOgEntries } from '../src/lib/og/entries.ts';
import { ogHeight, ogImagePath, ogWidth } from '../src/lib/og/model.ts';
import { pngSize } from '../src/lib/og/png.ts';
import { absoluteUrl } from '../src/lib/site.ts';

const client = path.resolve('dist/client');
const entries = collectOgEntries({
  editorial: path.resolve('content/editorial'),
  docs: path.resolve('content/glaux'),
  publicDir: path.resolve('public'),
});
const cards = walkContent(path.join(client, 'og'));
assert.ok(cards.length, 'Build the site before checking Open Graph cards');

const expected = new Set(entries.map((entry) => path.join(client, ogImagePath(entry.lang, entry.page))));
for (const file of expected) {
  assert.ok(existsSync(file), `Missing Open Graph card: ${path.relative(client, file)}`);
  const size = pngSize(readFileSync(file));
  assert.deepEqual(size, { width: ogWidth, height: ogHeight }, `${file} is not a ${ogWidth}x${ogHeight} PNG`);
}
// Anything else would be a card of a page that is not published, such as a draft.
for (const file of cards)
  assert.ok(expected.has(file), `Unexpected Open Graph card: ${path.relative(client, file)}`);

// Every prerendered page must point to its own card, and that card must be in the build.
const pages = walkContent(client).filter((file) => file.endsWith(`${path.sep}index.html`));
let checked = 0;
for (const file of pages) {
  const [lang, ...rest] = path.relative(client, path.dirname(file)).split(path.sep);
  if (lang !== 'en' && lang !== 'es') continue;
  const html = readFileSync(file, 'utf8');
  const want = absoluteUrl(ogImagePath(lang, rest.length ? `/${rest.join('/')}` : ''));
  const tags = (property: string) =>
    [...html.matchAll(new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)"`, 'g'))].map((match) => match[1]);
  const where = path.relative(client, file);
  assert.deepEqual(tags('og:image'), [want], `${where}: og:image`);
  assert.deepEqual(tags('twitter:image'), [want], `${where}: twitter:image`);
  assert.deepEqual(tags('twitter:card'), ['summary_large_image'], `${where}: twitter:card`);
  assert.deepEqual(tags('og:image:width'), [String(ogWidth)], `${where}: og:image:width`);
  assert.deepEqual(tags('og:image:height'), [String(ogHeight)], `${where}: og:image:height`);
  assert.equal(tags('og:image:alt').length, 1, `${where}: og:image:alt`);
  assert.ok(expected.has(path.join(client, new URL(want).pathname)), `${where}: ${want} is not in the build`);
  checked++;
}
console.log(`Open Graph cards passed: ${expected.size} cards of ${ogWidth}x${ogHeight}, ${checked} prerendered pages point to theirs.`);
