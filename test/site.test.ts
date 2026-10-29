import { expect, test } from 'vitest';
import { defaultLanguage, languages, isPublishedLanguage } from '../src/lib/i18n.ts';
import { isLocale, locales } from '../src/paraglide/runtime.js';
import { m } from '../src/paraglide/messages.js';
import { absoluteUrl } from '../src/lib/site.ts';
import { FALLBACK_LANGUAGE } from '../src/lib/glaux/manifest.ts';
import { decodeMarkdownUrl, getPageMarkdownUrl, getPageImageUrl } from '../src/lib/docs/urls.ts';

test('only English docs are published; the HTML shell also supports Spanish', () => {
  expect(languages).toStrictEqual(['en']);
  expect(defaultLanguage).toBe(FALLBACK_LANGUAGE);
  expect(isPublishedLanguage('es')).toBe(false);
  for (const value of ['unknown', '', undefined]) {
    expect(isPublishedLanguage(value)).toBe(false);
  }
});

test('documentation URLs preserve localized Markdown and image endpoints', () => {
  expect(getPageMarkdownUrl({ slugs: ['guide', 'getting-started'], locale: 'en' }).url).toBe('/en/docs/guide/getting-started.md');
  expect(getPageMarkdownUrl({ slugs: [], locale: 'en' }).url).toBe('/en/docs/index.md');
  expect(decodeMarkdownUrl(['guide', 'getting-started.md'])).toStrictEqual(['guide', 'getting-started']);
  expect(decodeMarkdownUrl(['index.md'])).toStrictEqual([]);
  expect(getPageImageUrl({ slugs: ['guide'], locale: 'en' }).url).toBe('/en/og/guide/image.webp');
  expect(absoluteUrl('/en/docs/guide')).toBe('https://glauxconsole.dev/en/docs/guide');
});


test('landing copy, SEO and documentation destinations support both languages', async () => {
  const { landingHead } = await import('../src/lib/landing/metadata.ts');
  const { documentationLinks, apiLinks } = await import('../src/lib/landing/navigation.ts');
  expect(locales).toStrictEqual(['en', 'es']);
  expect(isLocale('es')).toBe(true);
  expect(isLocale('unknown')).toBe(false);
  for (const lang of locales) {
    const head = landingHead(lang);
    expect(head.meta.some((meta) => 'title' in meta && meta.title === m.landing_title({}, { locale: lang }))).toBeTruthy();
    expect(head.links.some((link) => link.rel === 'canonical' && link.href === `https://glauxconsole.dev/${lang}`)).toBeTruthy();
    expect(head.links.some((link) => 'hrefLang' in link && link.hrefLang === 'es')).toBeTruthy();
  }
  const { existsSync } = await import('node:fs');
  for (const slug of [...documentationLinks, ...apiLinks].map((link) => link.slug)) {
    expect(existsSync(`content/glaux/en/${slug}.md`) || existsSync(`content/glaux/en/${slug}/index.md`), slug).toBeTruthy();
  }
});


test('the starter Luau example matches the published getting-started guide', async () => {
  const { readFileSync } = await import('node:fs');
  const { firstGame } = await import('../src/lib/landing/examples.ts');
  const guide = readFileSync('content/glaux/en/guide/getting-started.md', 'utf8');
  expect(guide.includes('```luau\n' + firstGame + '\n```')).toBeTruthy();
});
