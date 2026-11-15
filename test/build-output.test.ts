import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { collectOgEntries } from '@/lib/og/entries';
import { ogHeight, ogImagePath, ogWidth } from '@/lib/og/model';
import { pngSize } from '@/lib/og/png';
import { absoluteUrl } from '@/lib/site';
import { publishedDocs, root, walk } from './helpers.ts';

// Reads the output of `pnpm build`, so it fails until the site is built. CI builds before testing.
const client = path.join(root, 'dist/client');
test('the build emits a card for every published page and each prerendered page points to its own', () => {
  expect(existsSync(client), 'Run pnpm build before this test: dist/client does not exist').toBe(true);
  const entries = collectOgEntries({
    editorial: path.join(root, 'content/editorial'),
    docs: publishedDocs,
    publicDir: path.join(root, 'public'),
  });
  const expected = new Set(entries.map((entry) => path.join(client, ogImagePath(entry.lang, entry.page))));
  for (const file of expected) {
    expect(existsSync(file), `Missing Open Graph card: ${path.relative(client, file)}`).toBeTruthy();
    expect(pngSize(readFileSync(file)), file).toStrictEqual({ width: ogWidth, height: ogHeight });
  }
  // Anything else would be the card of a page that is not published, such as a draft.
  for (const file of walk(path.join(client, 'og')))
    expect(expected.has(file), `Unexpected Open Graph card: ${path.relative(client, file)}`).toBeTruthy();

  const pages = walk(client).filter((file) => file.endsWith(`${path.sep}index.html`));
  let checked = 0;
  for (const file of pages) {
    const [lang, ...rest] = path.relative(client, path.dirname(file)).split(path.sep);
    if (lang !== 'en' && lang !== 'es') continue;
    const html = readFileSync(file, 'utf8');
    const want = absoluteUrl(ogImagePath(lang, rest.length ? `/${rest.join('/')}` : ''));
    const metaTags = (property: string) =>
      [...html.matchAll(new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)"`, 'g'))].map((match) => match[1]);
    const where = path.relative(client, file);
    expect(metaTags('og:image'), `${where}: og:image`).toStrictEqual([want]);
    expect(metaTags('twitter:image'), `${where}: twitter:image`).toStrictEqual([want]);
    expect(metaTags('twitter:card'), `${where}: twitter:card`).toStrictEqual(['summary_large_image']);
    expect(metaTags('og:image:width'), `${where}: og:image:width`).toStrictEqual([String(ogWidth)]);
    expect(metaTags('og:image:height'), `${where}: og:image:height`).toStrictEqual([String(ogHeight)]);
    expect(metaTags('og:image:alt').length, `${where}: og:image:alt`).toBe(1);
    expect(expected.has(path.join(client, new URL(want).pathname)), `${where}: ${want} is not in the build`).toBeTruthy();
    checked++;
  }
  expect(checked > 0, 'No prerendered page was found in the build').toBeTruthy();
});
