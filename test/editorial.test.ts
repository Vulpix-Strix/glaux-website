import assert from 'node:assert/strict';
import { test } from 'node:test';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir, writeTree } from './helpers.ts';
import { loadContent, parseContent, resolveContentAssets } from '../src/lib/editorial/content.ts';
import {
  articleNeighbors,
  articleTranslations,
  articlesFor,
  parseArticleSearch,
  queryArticles,
  relatedArticles,
  rssFeed,
  seriesArticles,
} from '../src/lib/editorial/catalog.ts';
import { articleHead } from '../src/lib/editorial/metadata.ts';
import { calendarFile } from '../src/lib/editorial/calendar.ts';
import type { Article } from '../src/lib/editorial/model.ts';
const frontmatter = (extra = '') =>
  `---\nid: example\ntitle: Test article\ndescription: Test fixture only\nstatus: published\ndate: 2026-10-01\ncategories: [devlog]\n${extra}---\n\n## A heading\n\nA paragraph for testing.\n`;
function article(overrides: Partial<Article> = {}): Article {
  return {
    id: 'example',
    lang: 'en',
    section: 'blog',
    slug: 'example',
    title: 'Test fixture',
    description: 'Only tests',
    status: 'published',
    date: '2026-10-01',
    categories: ['devlog'],
    searchText: 'specific words',
    minutes: 1,
    words: 2,
    ...overrides,
  };
}
test('content validates metadata, publication dates, duplicate identities and series parts', () => {
  const dir = writeTree(tempDir(), { 'en/blog/example.mdx': frontmatter() });
  const file = path.join(dir, 'en/blog/example.mdx');
  assert.equal(parseContent(file, dir).article.minutes, 1);
  for (const source of [
    frontmatter().replace('2026-10-01', '2026-02-30'),
    frontmatter().replace('status: published', 'status: unknown'),
    frontmatter().replace('[devlog]', '[missing]'),
    frontmatter() + '\nimport X from "./private.mdx";\n',
  ]) {
    writeFileSync(file, source);
    assert.throws(() => parseContent(file, dir));
  }
  writeFileSync(file, frontmatter('series: {id: test, title: Test, part: 1}\n'));
  writeFileSync(path.join(dir, 'en/blog/another.mdx'), frontmatter());
  assert.throws(() => loadContent(dir, false), /Duplicate article identity/);
  writeFileSync(
    path.join(dir, 'en/blog/another.mdx'),
    frontmatter('series: {id: test, title: Test, part: 1}\n').replace('id: example', 'id: other'),
  );
  assert.throws(() => loadContent(dir, false), /Duplicate series part/);
});
test('drafts are excluded before compilation and published entries cannot reference draft resources', () => {
  const dir = writeTree(tempDir(), {
    'en/blog/public.mdx': frontmatter(),
    'en/blog/private.mdx':
      frontmatter()
        .replace('id: example', 'id: private')
        .replace('status: published', 'status: draft') + '\n![Private](asset:drafts/private.png)\n',
    'assets/drafts/private.png': 'PRIVATE_ASSET_SENTINEL',
  });
  const published = loadContent(dir, false);
  const development = loadContent(dir, true);
  assert.equal(published.length, 1);
  assert.equal(development.length, 2);
  const assets = new Map();
  for (const entry of published) resolveContentAssets(entry, dir, assets);
  assert.equal(assets.size, 0);
  const draft = development.find((entry) => entry.article.status === 'draft')!;
  const resolved = resolveContentAssets(draft, dir, assets);
  assert.match(resolved.body, /\/editorial-assets\/[a-f0-9]+-private.png/);
  assert.equal(assets.size, 1);
  assert.throws(
    () =>
      resolveContentAssets(
        { ...draft, article: { ...draft.article, status: 'published' } },
        dir,
        new Map(),
      ),
    /cannot reference draft/,
  );
  assert.throws(
    () =>
      resolveContentAssets(
        { ...draft, body: 'asset:published/../drafts/private.png' },
        dir,
        new Map(),
      ),
    /invalid asset/,
  );
});
test('catalog filters, clamps pagination and excludes drafts and other locales', () => {
  const articles = Array.from({ length: 14 }, (_, i) =>
    article({
      id: `id-${i}`,
      slug: `post-${i}`,
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
    }),
  );
  articles.push(article({ status: 'draft' }), article({ lang: 'es' }));
  const published = articlesFor(articles, 'en', 'blog');
  assert.equal(published.length, 14);
  assert.equal(published[0].slug, 'post-13');
  assert.equal(queryArticles(published, parseArticleSearch({ page: 99 })).items.length, 4);
  assert.equal(queryArticles(published, parseArticleSearch({ page: -1 })).page, 1);
  assert.equal(queryArticles(published, parseArticleSearch({ q: 'SPECIFIC' })).total, 14);
  assert.equal(queryArticles(published, parseArticleSearch({ category: 'community' })).total, 0);
  assert.equal(queryArticles(published, parseArticleSearch({ q: 'missing' })).total, 0);
});
test('translations, neighbors, related entries and series preserve publication boundaries', () => {
  const current = article({ series: { id: 'a', title: 'A', part: 2 } });
  const older = article({
    id: 'older',
    slug: 'older',
    date: '2026-09-01',
    series: { id: 'a', title: 'A', part: 1 },
  });
  const translated = article({ lang: 'es', slug: 'ejemplo' });
  const draft = article({ lang: 'es', status: 'draft' });
  const articles = [current, older, translated, draft];
  assert.deepEqual(
    articleTranslations(articles, current).map((item) => item.slug),
    ['example', 'ejemplo'],
  );
  assert.equal(articleNeighbors(articles, current).older, older);
  assert.equal(articleNeighbors(articles, current).newer, undefined);
  assert.deepEqual(relatedArticles(articles, current), [older]);
  assert.deepEqual(
    seriesArticles(articles, current).map((item) => item.series!.part),
    [1, 2],
  );
  const head = articleHead(current, [current, older]);
  assert.ok(!head.links.some((link) => 'hrefLang' in link && link.hrefLang === 'es'));
  assert.match(JSON.stringify(articleHead(draft, articles).meta), /noindex/);
});
test('RSS escapes XML and never includes drafts', () => {
  const xml = rssFeed(
    [article({ title: 'A & <B>' }), article({ title: 'Private sentinel', status: 'draft' })],
    'en',
    'blog',
    'https://glauxconsole.dev',
  );
  assert.match(xml, /A &amp; &lt;B&gt;/);
  assert.doesNotMatch(xml, /Private sentinel/);
  assert.equal((xml.match(/<item>/g) ?? []).length, 1);
});
test('calendar handles offsets, injection characters and UTF-8 folding', () => {
  const value = calendarFile({
    title: 'Test, only;\n' + 'á'.repeat(90),
    start: '2000-01-01T12:00:00-03:00',
    end: '2000-01-01T13:00:00-03:00',
    location: 'Local test',
  });
  assert.match(value, /DTSTART:20000101T150000Z/);
  assert.match(value, /Test\\, only\\;\\n/);
  for (const line of value.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
  assert.throws(() =>
    calendarFile({ title: 'Test', start: '2000-01-01', end: '2000-01-02', location: 'Test' }),
  );
});
test('both development templates include every editorial block and no publication date', () => {
  for (const lang of ['en', 'es']) {
    const entry = parseContent(
      path.resolve(`content/editorial/${lang}/blog/devlog-template.mdx`),
      path.resolve('content/editorial'),
    );
    assert.equal(entry.article.status, 'draft');
    assert.equal(entry.article.date, undefined);
    for (const component of [
      'ArticleGallery',
      'ImageComparison',
      'ArticleVideo',
      'AnimatedClip',
      'EventCard',
      'Metric',
      'Milestone',
      'Tabs',
      'TypeTable',
      'InlineTOC',
      'EditorialNotice',
      'ResourceCard',
      'GameCard',
    ])
      assert.ok(entry.body.includes(`<${component}`), component);
  }
});

test('reduced motion pauses initially and on changes, never resumes and removes listeners', async () => {
  const { pauseOnReducedMotion } = await import('../src/lib/editorial/media.ts');
  class Preference extends EventTarget {
    matches = true;
  }
  const preference = new Preference();
  let pauses = 0;
  const cleanup = pauseOnReducedMotion(preference as unknown as MediaQueryList, () => {
    pauses++;
  });
  assert.equal(pauses, 1);
  preference.matches = false;
  preference.dispatchEvent(new Event('change'));
  assert.equal(pauses, 1);
  preference.matches = true;
  preference.dispatchEvent(new Event('change'));
  assert.equal(pauses, 2);
  cleanup();
  preference.dispatchEvent(new Event('change'));
  assert.equal(pauses, 2);
});

test('development media supports bounded, open and suffix byte ranges for native seeking', async () => {
  const { assetRange } = await import('../src/lib/editorial/asset-range.ts');
  assert.deepEqual(assetRange('bytes=0-9', 100), { start: 0, end: 9 });
  assert.deepEqual(assetRange('bytes=50-', 100), { start: 50, end: 99 });
  assert.deepEqual(assetRange('bytes=-10', 100), { start: 90, end: 99 });
  assert.deepEqual(assetRange('bytes=0-999', 100), { start: 0, end: 99 });
  assert.equal(assetRange(undefined, 100), undefined);
  for (const value of ['bytes=100-', 'bytes=9-1', 'bytes=-0', 'bytes=0-1,5-6', 'bytes=-'])
    assert.throws(() => assetRange(value, 100));
});

test('search defaults do not introduce redirects on canonical list URLs', async () => {
  const { validateArticleSearch } = await import('../src/lib/editorial/catalog.ts');
  assert.deepEqual(validateArticleSearch({}), {});
  assert.deepEqual(
    validateArticleSearch({ q: '', category: '', page: '1', unknown: 'discard' }),
    {},
  );
  assert.deepEqual(validateArticleSearch({ q: 'shell', category: 'devlog', page: '2' }), {
    q: 'shell',
    category: 'devlog',
    page: 2,
  });
});

