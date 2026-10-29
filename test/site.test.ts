import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultLanguage, languages, isPublishedLanguage } from '../src/lib/i18n.ts';
import { isLocale, locales } from '../src/paraglide/runtime.js';
import { m } from '../src/paraglide/messages.js';
import { absoluteUrl } from '../src/lib/site.ts';
import { FALLBACK_LANGUAGE } from '../src/lib/glaux/manifest.ts';
import { decodeMarkdownUrl, getPageMarkdownUrl, getPageImageUrl } from '../src/lib/docs/urls.ts';

test('only English docs are published; the HTML shell also supports Spanish', () => {
  assert.deepEqual(languages, ['en']);
  assert.equal(defaultLanguage, FALLBACK_LANGUAGE);
  assert.equal(isPublishedLanguage('es'), false);
  for (const value of ['unknown', '', undefined]) {
    assert.equal(isPublishedLanguage(value), false);
  }
});

test('documentation URLs preserve localized Markdown and image endpoints', () => {
  assert.equal(getPageMarkdownUrl({ slugs: ['guide', 'getting-started'], locale: 'en' }).url, '/en/docs/guide/getting-started.md');
  assert.equal(getPageMarkdownUrl({ slugs: [], locale: 'en' }).url, '/en/docs/index.md');
  assert.deepEqual(decodeMarkdownUrl(['guide', 'getting-started.md']), ['guide', 'getting-started']);
  assert.deepEqual(decodeMarkdownUrl(['index.md']), []);
  assert.equal(getPageImageUrl({ slugs: ['guide'], locale: 'en' }).url, '/en/og/guide/image.webp');
  assert.equal(absoluteUrl('/en/docs/guide'), 'https://glauxconsole.dev/en/docs/guide');
});


test('landing copy, SEO and documentation destinations support both languages', async () => {
  const { landingHead } = await import('../src/lib/landing/metadata.ts');
  const { documentationLinks, apiLinks } = await import('../src/lib/landing/navigation.ts');
  assert.deepEqual(locales, ['en', 'es']);
  assert.equal(isLocale('es'), true);
  assert.equal(isLocale('unknown'), false);
  for (const lang of locales) {
    const head = landingHead(lang);
    assert.ok(head.meta.some((meta) => 'title' in meta && meta.title === m.landing_title({}, { locale: lang })));
    assert.ok(head.links.some((link) => link.rel === 'canonical' && link.href === `https://glauxconsole.dev/${lang}`));
    assert.ok(head.links.some((link) => 'hrefLang' in link && link.hrefLang === 'es'));
  }
  const { existsSync } = await import('node:fs');
  for (const slug of [...documentationLinks, ...apiLinks].map((link) => link.slug)) {
    assert.ok(existsSync(`content/glaux/en/${slug}.md`) || existsSync(`content/glaux/en/${slug}/index.md`), slug);
  }
});


test('the starter Luau example matches the published getting-started guide', async () => {
  const { readFileSync } = await import('node:fs');
  const { firstGame } = await import('../src/lib/landing/examples.ts');
  const guide = readFileSync('content/glaux/en/guide/getting-started.md', 'utf8');
  assert.ok(guide.includes('```luau\n' + firstGame + '\n```'));
});
