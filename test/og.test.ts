import assert from 'node:assert/strict';
import { test } from 'node:test';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { root, tempDir, walk, writeTree } from './helpers.ts';
import { collectOgEntries } from '../src/lib/og/entries.ts';
import { ogHeight, ogImagePath, ogWidth, type OgEntry } from '../src/lib/og/model.ts';
import { pngSize } from '../src/lib/og/png.ts';
import { createOgRenderer } from '../src/lib/og/render.ts';
import { loadContent } from '../src/lib/editorial/content.ts';
import { articleHead } from '../src/lib/editorial/metadata.ts';
import { landingHead, pageHead } from '../src/lib/landing/metadata.ts';
import { absoluteUrl } from '../src/lib/site.ts';

const screenshot = path.join(root, 'public/images/landing/signal-lost-gameplay.png');
const article = (title: string, extra = '') =>
  `---\nid: ${title.toLowerCase().replace(/\W+/g, '-')}\ntitle: ${title}\ndescription: Test fixture only\nstatus: published\ndate: 2026-10-01\ncategories: [development]\n${extra}---\n\nBody.\n`;

/** A content tree with published and draft articles in both languages, and a small manual. */
function fixture() {
  const dir = tempDir();
  const editorial = writeTree(path.join(dir, 'editorial'), {
    'en/news/with-cover.mdx': article(
      'Meet the cover',
      'cover:\n  src: asset:published/shot.png\n  alt: A screenshot\n  width: 320\n  height: 240\n',
    ),
    'es/news/sin-portada.mdx': article('Una noticia sin portada'),
    'en/blog/devlog-twelve.mdx': article('Devlog twelve', 'number: 12\n'),
    'en/blog/secret.mdx': article('Secret draft').replace('status: published', 'status: draft'),
  });
  mkdirSync(path.join(editorial, 'assets/published'), { recursive: true });
  copyFileSync(screenshot, path.join(editorial, 'assets/published/shot.png'));
  const docs = writeTree(path.join(dir, 'docs'), {
    'en/api/graphics/spr.md': '---\ntitle: "spr"\ndescription: "Draws a sprite. Second sentence."\n---\n\nBody.\n',
    'en/guide/index.md': '---\ntitle: "Glaux guide"\n---\n\nBody.\n',
    'es/guide/index.md': '---\ntitle: "Guia"\n---\n\nBody.\n',
  });
  return { editorial, docs, publicDir: path.join(root, 'public') };
}
const find = (entries: OgEntry[], lang: string, page: string) =>
  entries.find((entry) => entry.lang === lang && entry.page === page);

test('card paths mirror the page paths below the language', () => {
  assert.equal(ogImagePath('en', ''), '/og/en/index.png');
  assert.equal(ogImagePath('es', '/news'), '/og/es/news.png');
  assert.equal(ogImagePath('en', '/docs/api/btn'), '/og/en/docs/api/btn.png');
});

test('entries take titles, labels and dates from messages and content, per language', () => {
  const entries = collectOgEntries(fixture());
  assert.equal(find(entries, 'en', '')?.title, 'Build small worlds.');
  assert.equal(find(entries, 'es', '')?.title, 'Crea pequeños mundos.');
  assert.equal(find(entries, 'es', '/news')?.path, '~/noticias');
  assert.equal(find(entries, 'en', '/news')?.path, '~/news');

  const story = find(entries, 'es', '/news/sin-portada');
  assert.equal(story?.kind, 'news');
  assert.equal(story?.category?.label, 'Desarrollo');
  assert.match(story?.meta?.full ?? '', /min de lectura$/);
  assert.match(story?.meta?.compact ?? '', /1 min$/);
  assert.equal(story?.cover, undefined);

  const devlog = find(entries, 'en', '/blog/devlog-twelve');
  assert.equal(devlog?.devlog, 12);
  assert.equal(devlog?.path, '~/devlog');
});

test('a cover is optional and only present when the article declares one', () => {
  const entries = collectOgEntries(fixture());
  const cover = find(entries, 'en', '/news/with-cover')?.cover;
  assert.equal(cover?.alt, 'A screenshot');
  assert.ok(cover?.file.endsWith('shot.png'));
  assert.ok(find(entries, 'en', '')?.cover);
});

test('documentation entries follow the manual and only cover published languages', () => {
  const entries = collectOgEntries(fixture()).filter((entry) => entry.kind === 'docs');
  assert.deepEqual(entries.map((entry) => entry.page).sort(), ['/docs/api/graphics/spr', '/docs/guide']);
  const spr = find(entries, 'en', '/docs/api/graphics/spr');
  assert.equal(spr?.path, '~/docs/api/graphics');
  assert.equal(spr?.subtitle, 'Draws a sprite.');
});

test('drafts have no card unless the dev server asks for them', () => {
  const sources = fixture();
  const production = collectOgEntries(sources).map((entry) => entry.page);
  assert.ok(!production.includes('/blog/secret'));
  const development = collectOgEntries({ ...sources, drafts: true }).map((entry) => entry.page);
  assert.ok(development.includes('/blog/secret'));
});

const long = {
  en: 'Why I picked 8×8 tiles, 1024 tile references and a separate System ROM for a fantasy console that fits in 320×240 pixels',
  es: 'Hoja de ruta 2027: lo que viene para el shell, el editor de sprites y los cartuchos de la consola',
};
const variants = (lang: 'en' | 'es', title: string, withCover: boolean): OgEntry[] => {
  const cover = withCover ? { cover: { file: screenshot, alt: 'x' } } : {};
  const meta = { full: 'Oct 29, 2026  ·  4 min read', compact: 'Oct 29, 2026  ·  4 min' };
  const category = { label: 'Design', hue: 'pink' } as const;
  return [
    { lang, page: '', kind: 'landing', path: 'FANTASY CONSOLE', title, subtitle: 'A subtitle.', ...cover },
    { lang, page: '/news/x', kind: 'news', path: '~/news', title, category, meta, ...cover },
    { lang, page: '/blog/x', kind: 'blog', path: '~/devlog', title, devlog: 7, category, meta, ...cover },
    { lang, page: '/docs/guide/x', kind: 'docs', path: '~/docs/guide', title, subtitle: 'A subtitle.', ...cover },
  ];
};

test('every template renders a 1200x630 PNG for short and long titles, with and without cover', async () => {
  const renderer = await createOgRenderer();
  for (const lang of ['en', 'es'] as const)
    for (const title of ['Meet Glaux', long[lang]])
      for (const withCover of [false, true])
        for (const entry of variants(lang, title, withCover)) {
          const { png, fit } = await renderer.render(entry);
          assert.deepEqual(pngSize(png), { width: ogWidth, height: ogHeight }, `${entry.kind} ${lang}`);
          assert.equal(fit.truncated, false, `${entry.kind} ${lang} "${title.slice(0, 20)}"`);
        }
});

test('long titles shrink or drop the cover before they are ever cut', async () => {
  const renderer = await createOgRenderer();
  const [, news] = variants('en', 'Short', true);
  const short = await renderer.render(news);
  const longer = await renderer.render({ ...news, title: long.en });
  assert.ok(longer.fit.titleSize < short.fit.titleSize);
  const extreme = await renderer.render({ ...news, title: `${long.en} ${long.en} ${long.en}` });
  assert.equal(extreme.fit.withCover, false);
  assert.equal(extreme.fit.truncated, true);
  assert.deepEqual(pngSize(extreme.png), { width: ogWidth, height: ogHeight });
});

const tags = (head: { meta: object[] }, key: 'property' | 'name') =>
  Object.fromEntries(
    head.meta
      .filter((item): item is Record<string, string> => key in item)
      .map((item) => [item[key], item.content]),
  );

test('page heads point to the card of the page, with its size, alt and a large twitter card', () => {
  for (const lang of ['en', 'es'] as const) {
    const head = landingHead(lang);
    const og = tags(head, 'property');
    assert.equal(og['og:image'], `https://glauxconsole.dev/og/${lang}/index.png`);
    assert.equal(og['og:image:width'], '1200');
    assert.equal(og['og:image:height'], '630');
    assert.ok(og['og:image:alt']);
    const twitter = tags(head, 'name');
    assert.equal(twitter['twitter:card'], 'summary_large_image');
    assert.equal(twitter['twitter:image'], og['og:image']);
    assert.ok(head.links.some((link) => link.rel === 'canonical' && link.href.endsWith(`/${lang}`)));
    assert.equal(head.links.filter((link) => link.rel === 'alternate').length, 3);
  }
  const docs = pageHead('en', '/docs/guide', { title: 'Guide', description: 'd', languages: ['en'] });
  assert.equal(docs.links.filter((link) => link.rel === 'alternate').length, 2);
});

test('article heads use the generated card and keep canonical and alternates', () => {
  const sources = fixture();
  const articles = loadContent(sources.editorial, false).map((entry) => entry.article);
  const withCover = articles.find((item) => item.slug === 'with-cover')!;
  const head = articleHead(withCover, articles);
  const og = tags(head, 'property');
  assert.equal(og['og:image'], 'https://glauxconsole.dev/og/en/news/with-cover.png');
  assert.equal(og['og:image:alt'], 'A screenshot');
  assert.equal(og['og:type'], 'article');
  assert.equal(tags(head, 'name')['twitter:card'], 'summary_large_image');
  assert.ok(head.links.some((link) => link.rel === 'canonical'));
  assert.match(head.scripts[0].children, /\/og\/en\/news\/with-cover\.png/);
});

// Reads the output of `pnpm build`, so it only runs once the site is built. CI builds first and
// never skips it.
const client = path.join(root, 'dist/client');
test('the build emits a card for every published page and each prerendered page points to its own', {
  skip: !existsSync(client) && !process.env.CI,
}, () => {
  const entries = collectOgEntries({
    editorial: path.join(root, 'content/editorial'),
    docs: path.join(root, 'content/glaux'),
    publicDir: path.join(root, 'public'),
  });
  const expected = new Set(entries.map((entry) => path.join(client, ogImagePath(entry.lang, entry.page))));
  for (const file of expected) {
    assert.ok(existsSync(file), `Missing Open Graph card: ${path.relative(client, file)}`);
    assert.deepEqual(pngSize(readFileSync(file)), { width: ogWidth, height: ogHeight }, file);
  }
  // Anything else would be the card of a page that is not published, such as a draft.
  for (const file of walk(path.join(client, 'og')))
    assert.ok(expected.has(file), `Unexpected Open Graph card: ${path.relative(client, file)}`);

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
    assert.deepEqual(metaTags('og:image'), [want], `${where}: og:image`);
    assert.deepEqual(metaTags('twitter:image'), [want], `${where}: twitter:image`);
    assert.deepEqual(metaTags('twitter:card'), ['summary_large_image'], `${where}: twitter:card`);
    assert.deepEqual(metaTags('og:image:width'), [String(ogWidth)], `${where}: og:image:width`);
    assert.deepEqual(metaTags('og:image:height'), [String(ogHeight)], `${where}: og:image:height`);
    assert.equal(metaTags('og:image:alt').length, 1, `${where}: og:image:alt`);
    assert.ok(expected.has(path.join(client, new URL(want).pathname)), `${where}: ${want} is not in the build`);
    checked++;
  }
  assert.ok(checked > 0, 'No prerendered page was found in the build');
});
