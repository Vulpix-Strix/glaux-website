import { expect, test } from 'vitest';
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
  expect(parseContent(file, dir).article.minutes).toBe(1);
  for (const source of [
    frontmatter().replace('2026-10-01', '2026-02-30'),
    frontmatter().replace('status: published', 'status: unknown'),
    frontmatter().replace('[devlog]', '[missing]'),
    frontmatter() + '\nimport X from "./private.mdx";\n',
  ]) {
    writeFileSync(file, source);
    expect(() => parseContent(file, dir)).toThrow();
  }
  writeFileSync(file, frontmatter('series: {id: test, title: Test, part: 1}\n'));
  writeFileSync(path.join(dir, 'en/blog/another.mdx'), frontmatter());
  expect(() => loadContent(dir, false)).toThrow(/Duplicate article identity/);
  writeFileSync(
    path.join(dir, 'en/blog/another.mdx'),
    frontmatter('series: {id: test, title: Test, part: 1}\n').replace('id: example', 'id: other'),
  );
  expect(() => loadContent(dir, false)).toThrow(/Duplicate series part/);
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
  expect(published.length).toBe(1);
  expect(development.length).toBe(2);
  const assets = new Map();
  for (const entry of published) resolveContentAssets(entry, dir, assets);
  expect(assets.size).toBe(0);
  const draft = development.find((entry) => entry.article.status === 'draft')!;
  const resolved = resolveContentAssets(draft, dir, assets);
  expect(resolved.body).toMatch(/\/editorial-assets\/[a-f0-9]+-private.png/);
  expect(assets.size).toBe(1);
  expect(() =>
      resolveContentAssets(
        { ...draft, article: { ...draft.article, status: 'published' } },
        dir,
        new Map(),
      )).toThrow(/cannot reference draft/);
  expect(() =>
      resolveContentAssets(
        { ...draft, body: 'asset:published/../drafts/private.png' },
        dir,
        new Map(),
      )).toThrow(/invalid asset/);
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
  expect(published.length).toBe(14);
  expect(published[0].slug).toBe('post-13');
  expect(queryArticles(published, parseArticleSearch({ page: 99 })).items.length).toBe(4);
  expect(queryArticles(published, parseArticleSearch({ page: -1 })).page).toBe(1);
  expect(queryArticles(published, parseArticleSearch({ q: 'SPECIFIC' })).total).toBe(14);
  expect(queryArticles(published, parseArticleSearch({ category: 'community' })).total).toBe(0);
  expect(queryArticles(published, parseArticleSearch({ q: 'missing' })).total).toBe(0);
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
  expect(articleTranslations(articles, current).map((item) => item.slug)).toStrictEqual(['example', 'ejemplo']);
  expect(articleNeighbors(articles, current).older).toBe(older);
  expect(articleNeighbors(articles, current).newer).toBe(undefined);
  expect(relatedArticles(articles, current)).toStrictEqual([older]);
  expect(seriesArticles(articles, current).map((item) => item.series!.part)).toStrictEqual([1, 2]);
  const head = articleHead(current, [current, older]);
  expect(!head.links.some((link) => 'hrefLang' in link && link.hrefLang === 'es')).toBeTruthy();
  expect(JSON.stringify(articleHead(draft, articles).meta)).toMatch(/noindex/);
});
test('RSS escapes XML and never includes drafts', () => {
  const xml = rssFeed(
    [article({ title: 'A & <B>' }), article({ title: 'Private sentinel', status: 'draft' })],
    'en',
    'blog',
    'https://glauxconsole.dev',
  );
  expect(xml).toMatch(/A &amp; &lt;B&gt;/);
  expect(xml).not.toMatch(/Private sentinel/);
  expect((xml.match(/<item>/g) ?? []).length).toBe(1);
});
test('calendar handles offsets, injection characters and UTF-8 folding', () => {
  const value = calendarFile({
    title: 'Test, only;\n' + 'á'.repeat(90),
    start: '2000-01-01T12:00:00-03:00',
    end: '2000-01-01T13:00:00-03:00',
    location: 'Local test',
  });
  expect(value).toMatch(/DTSTART:20000101T150000Z/);
  expect(value).toMatch(/Test\\, only\\;\\n/);
  for (const line of value.split('\r\n')) expect(Buffer.byteLength(line) <= 75).toBeTruthy();
  expect(() =>
    calendarFile({ title: 'Test', start: '2000-01-01', end: '2000-01-02', location: 'Test' })).toThrow();
});
test('both development templates include every editorial block and no publication date', () => {
  for (const lang of ['en', 'es']) {
    const entry = parseContent(
      path.resolve(`content/editorial/${lang}/blog/devlog-template.mdx`),
      path.resolve('content/editorial'),
    );
    expect(entry.article.status).toBe('draft');
    expect(entry.article.date).toBe(undefined);
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
      expect(entry.body.includes(`<${component}`), component).toBeTruthy();
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
  expect(pauses).toBe(1);
  preference.matches = false;
  preference.dispatchEvent(new Event('change'));
  expect(pauses).toBe(1);
  preference.matches = true;
  preference.dispatchEvent(new Event('change'));
  expect(pauses).toBe(2);
  cleanup();
  preference.dispatchEvent(new Event('change'));
  expect(pauses).toBe(2);
});

test('development media supports bounded, open and suffix byte ranges for native seeking', async () => {
  const { assetRange } = await import('../src/lib/editorial/asset-range.ts');
  expect(assetRange('bytes=0-9', 100)).toStrictEqual({ start: 0, end: 9 });
  expect(assetRange('bytes=50-', 100)).toStrictEqual({ start: 50, end: 99 });
  expect(assetRange('bytes=-10', 100)).toStrictEqual({ start: 90, end: 99 });
  expect(assetRange('bytes=0-999', 100)).toStrictEqual({ start: 0, end: 99 });
  expect(assetRange(undefined, 100)).toBe(undefined);
  for (const value of ['bytes=100-', 'bytes=9-1', 'bytes=-0', 'bytes=0-1,5-6', 'bytes=-'])
    expect(() => assetRange(value, 100)).toThrow();
});

test('search defaults do not introduce redirects on canonical list URLs', async () => {
  const { validateArticleSearch } = await import('../src/lib/editorial/catalog.ts');
  expect(validateArticleSearch({})).toStrictEqual({});
  expect(validateArticleSearch({ q: '', category: '', page: '1', unknown: 'discard' })).toStrictEqual({});
  expect(validateArticleSearch({ q: 'shell', category: 'devlog', page: '2' })).toStrictEqual({
    q: 'shell',
    category: 'devlog',
    page: 2,
  });
});

