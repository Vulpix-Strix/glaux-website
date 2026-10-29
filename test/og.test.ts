import { expect, test } from 'vitest';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { root, tempDir, writeTree } from './helpers.ts';
import { collectOgEntries } from '@/lib/og/entries';
import { ogHeight, ogImagePath, ogWidth, type OgEntry } from '@/lib/og/model';
import { pngSize } from '@/lib/og/png';
import { createOgRenderer } from '@/lib/og/render';
import { loadContent, resolveContentAssets } from '@/lib/editorial/content';
import { articleHead } from '@/lib/editorial/metadata';
import { landingHead, pageHead } from '@/lib/landing/metadata';

const screenshot = path.join(root, 'public/images/landing/signal-lost-gameplay.png');
const article = (title: string, extra = '') =>
  `---\nid: ${title.toLowerCase().replace(/\W+/g, '-')}\ntitle: ${title}\ndescription: Test fixture only\nstatus: published\ndate: 2026-10-01\ncategories: [development]\n${extra}---\n\nBody.\n`;

/** A content tree with published and draft articles in both languages, and a small manual. */
function fixture() {
  const dir = tempDir();
  const editorial = writeTree(path.join(dir, 'editorial'), {
    'en/news/with-cover.mdx': article(
      'Meet the cover',
      'cover:\n  src: asset:with-cover/shot.png\n  alt: A screenshot\n  width: 320\n  height: 240\n',
    ),
    'es/news/sin-portada.mdx': article('Una noticia sin portada'),
    'en/blog/devlog-twelve.mdx': article('Devlog twelve', 'number: 12\n'),
    'en/news/cover-and-og.mdx': article(
      'Cover and card',
      'cover:\n  src: asset:with-cover/shot.png\n  alt: Cover alt\nogImage:\n  src: asset:custom/card.png\n  alt: Card alt\n',
    ),
    'en/news/og-only.mdx': article('Only a card', 'ogImage:\n  src: asset:custom/card.png\n'),
    'en/news/og-unknown-size.mdx': article('Card of unknown size', 'ogImage:\n  src: asset:custom/card.svg\n'),
    'en/blog/secret.mdx': article('Secret draft').replace('status: published', 'status: draft'),
  });
  for (const folder of ['with-cover', 'custom']) mkdirSync(path.join(editorial, 'assets', folder), { recursive: true });
  copyFileSync(screenshot, path.join(editorial, 'assets/with-cover/shot.png'));
  copyFileSync(screenshot, path.join(editorial, 'assets/custom/card.png'));
  writeFileSync(path.join(editorial, 'assets/custom/card.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
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
  expect(ogImagePath('en', '')).toBe('/og/en/index.png');
  expect(ogImagePath('es', '/news')).toBe('/og/es/news.png');
  expect(ogImagePath('en', '/docs/api/btn')).toBe('/og/en/docs/api/btn.png');
});

test('entries take titles, labels and dates from messages and content, per language', () => {
  const entries = collectOgEntries(fixture());
  expect(find(entries, 'en', '')?.title).toBe('Build small worlds.');
  expect(find(entries, 'es', '')?.title).toBe('Crea pequeños mundos.');
  expect(find(entries, 'es', '/news')?.path).toBe('~/noticias');
  expect(find(entries, 'en', '/news')?.path).toBe('~/news');

  const story = find(entries, 'es', '/news/sin-portada');
  expect(story?.kind).toBe('news');
  expect(story?.category?.label).toBe('Desarrollo');
  expect(story?.meta?.full ?? '').toMatch(/min de lectura$/);
  expect(story?.meta?.compact ?? '').toMatch(/1 min$/);
  expect(story?.cover).toBe(undefined);

  const devlog = find(entries, 'en', '/blog/devlog-twelve');
  expect(devlog?.devlog).toBe(12);
  expect(devlog?.path).toBe('~/devlog');
});

test('a cover is optional and only present when the article declares one', () => {
  const entries = collectOgEntries(fixture());
  const cover = find(entries, 'en', '/news/with-cover')?.cover;
  expect(cover?.alt).toBe('A screenshot');
  expect(cover?.file.endsWith('shot.png')).toBeTruthy();
  expect(find(entries, 'en', '')?.cover).toBeTruthy();
});

test('documentation entries follow the manual and only cover published languages', () => {
  const entries = collectOgEntries(fixture()).filter((entry) => entry.kind === 'docs');
  expect(entries.map((entry) => entry.page).sort()).toStrictEqual(['/docs/api/graphics/spr', '/docs/guide']);
  const spr = find(entries, 'en', '/docs/api/graphics/spr');
  expect(spr?.path).toBe('~/docs/api/graphics');
  expect(spr?.subtitle).toBe('Draws a sprite.');
});

test('drafts have no card unless the dev server asks for them', () => {
  const sources = fixture();
  const production = collectOgEntries(sources).map((entry) => entry.page);
  expect(!production.includes('/blog/secret')).toBeTruthy();
  const development = collectOgEntries({ ...sources, drafts: true }).map((entry) => entry.page);
  expect(development.includes('/blog/secret')).toBeTruthy();
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
          expect(pngSize(png), `${entry.kind} ${lang}`).toStrictEqual({ width: ogWidth, height: ogHeight });
          expect(fit.truncated, `${entry.kind} ${lang} "${title.slice(0, 20)}"`).toBe(false);
        }
});

test('long titles shrink or drop the cover before they are ever cut', async () => {
  const renderer = await createOgRenderer();
  const [, news] = variants('en', 'Short', true);
  const short = await renderer.render(news);
  const longer = await renderer.render({ ...news, title: long.en });
  expect(longer.fit.titleSize < short.fit.titleSize).toBeTruthy();
  const extreme = await renderer.render({ ...news, title: `${long.en} ${long.en} ${long.en}` });
  expect(extreme.fit.withCover).toBe(false);
  expect(extreme.fit.truncated).toBe(true);
  expect(pngSize(extreme.png)).toStrictEqual({ width: ogWidth, height: ogHeight });
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
    expect(og['og:image']).toBe(`https://glauxconsole.dev/og/${lang}/index.png`);
    expect(og['og:image:width']).toBe('1200');
    expect(og['og:image:height']).toBe('630');
    expect(og['og:image:alt']).toBeTruthy();
    const twitter = tags(head, 'name');
    expect(twitter['twitter:card']).toBe('summary_large_image');
    expect(twitter['twitter:image']).toBe(og['og:image']);
    expect(head.links.some((link) => link.rel === 'canonical' && link.href.endsWith(`/${lang}`))).toBeTruthy();
    expect(head.links.filter((link) => link.rel === 'alternate').length).toBe(3);
  }
  const docs = pageHead('en', '/docs/guide', { title: 'Guide', description: 'd', languages: ['en'] });
  expect(docs.links.filter((link) => link.rel === 'alternate').length).toBe(2);
});

test('article heads use the generated card and keep canonical and alternates', () => {
  const sources = fixture();
  const articles = loadContent(sources.editorial, false).map((entry) => entry.article);
  const withCover = articles.find((item) => item.slug === 'with-cover')!;
  const head = articleHead(withCover, articles);
  const og = tags(head, 'property');
  expect(og['og:image']).toBe('https://glauxconsole.dev/og/en/news/with-cover.png');
  expect(og['og:image:alt']).toBe('A screenshot');
  expect(og['og:type']).toBe('article');
  expect(tags(head, 'name')['twitter:card']).toBe('summary_large_image');
  expect(head.links.some((link) => link.rel === 'canonical')).toBeTruthy();
  expect(head.scripts[0].children).toMatch(/\/og\/en\/news\/with-cover\.png/);
});

test('cover and ogImage are independent: the cover never replaces the generated card', () => {
  const sources = fixture();
  const assets = new Map();
  const articles = loadContent(sources.editorial, false).map((entry) => resolveContentAssets(entry, sources.editorial, assets).article);
  const head = (slug: string) => {
    const item = articles.find((candidate) => candidate.slug === slug)!;
    const result = articleHead(item, articles);
    return { item, og: tags(result, 'property'), twitter: tags(result, 'name'), json: JSON.parse(result.scripts[0].children) };
  };
  const card = (slug: string) => `https://glauxconsole.dev/og/en/news/${slug}.png`;

  const coverOnly = head('with-cover');
  expect(coverOnly.item.cover).toBeTruthy();
  expect(coverOnly.og['og:image']).toBe(card('with-cover'));
  expect(coverOnly.twitter['twitter:image']).toBe(card('with-cover'));
  expect(coverOnly.json.image).toBe(card('with-cover'));
  expect(coverOnly.og['og:image:width']).toBe('1200');

  const both = head('cover-and-og');
  expect(both.item.cover?.src).toMatch(/^\/editorial-assets\/.+shot\.png$/);
  expect(both.og['og:image']).toMatch(/^https:\/\/glauxconsole\.dev\/editorial-assets\/[a-f0-9]+-card\.png$/);
  expect(both.twitter['twitter:image']).toBe(both.og['og:image']);
  expect(both.json.image).toBe(both.og['og:image']);
  expect(both.og['og:image:alt']).toBe('Card alt');
  expect(both.twitter['twitter:image:alt']).toBe('Card alt');

  const only = head('og-only');
  expect(only.item.cover).toBe(undefined);
  expect(only.og['og:image']).toBe(both.og['og:image']);
  expect(only.og['og:image:alt']).toBe('Only a card');
  expect(only.og['og:image:width']).toBe('1154');
  expect(only.og['og:image:height']).toBe('866');

  const unknown = head('og-unknown-size');
  expect(unknown.og['og:image']).toMatch(/card\.svg$/);
  expect(unknown.og['og:image:width']).toBe(undefined);
  expect(unknown.og['og:image:height']).toBe(undefined);

  for (const { og, twitter } of [coverOnly, both, only, unknown]) {
    expect(twitter['twitter:title']).toBe(og['og:title']);
    expect(twitter['twitter:description']).toBe(og['og:description']);
    expect(og['og:image']).toMatch(/^https:\/\//);
  }
  const entries = collectOgEntries(sources);
  for (const slug of ['cover-and-og', 'og-only', 'og-unknown-size'])
    expect(find(entries, 'en', `/news/${slug}`)).toBeTruthy();
});
