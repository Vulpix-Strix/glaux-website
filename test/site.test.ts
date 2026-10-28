import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultLanguage, languages, getLanguage, isPublishedLanguage } from '../src/lib/i18n.ts';
import { absoluteUrl } from '../src/lib/site.ts';
import { FALLBACK_LANGUAGE } from '../src/lib/glaux/manifest.ts';
import { decodeMarkdownUrl, getPageMarkdownUrl, getPageImageUrl } from '../src/lib/docs/urls.ts';

test('only English is published and invalid languages resolve to the default for the HTML shell', () => {
  assert.deepEqual(languages, ['en']);
  assert.equal(defaultLanguage, FALLBACK_LANGUAGE);
  assert.equal(getLanguage('en'), 'en');
  for (const value of ['es', 'unknown', '', undefined]) {
    assert.equal(isPublishedLanguage(value), false);
    assert.equal(getLanguage(value), 'en');
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
