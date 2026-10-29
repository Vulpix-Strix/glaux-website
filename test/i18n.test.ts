import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { m } from '../src/paraglide/messages.js';
import { baseLocale, locales } from '../src/paraglide/runtime.js';

const catalog = (locale: string): Record<string, string> => {
  const { $schema: _schema, ...messages } = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'));
  return messages;
};
const placeholders = (text: string) => (text.match(/\{\w+}/g) ?? []).sort();

test('every locale translates every message with the same placeholders', () => {
  const base = catalog(baseLocale);
  for (const locale of locales) {
    const messages = catalog(locale);
    assert.deepEqual(Object.keys(messages).sort(), Object.keys(base).sort(), locale);
    for (const [key, text] of Object.entries(messages)) {
      assert.ok(text.trim(), `${locale}: ${key} is empty`);
      assert.ok(!text.includes('[POST'), `${locale}: ${key} has a placeholder`);
      assert.deepEqual(placeholders(text), placeholders(base[key]), `${locale}: ${key}`);
    }
  }
});

test('messages follow an explicit locale, whatever the current one is', () => {
  assert.equal(m.editorial_news({}, { locale: 'en' }), 'News');
  assert.equal(m.editorial_news({}, { locale: 'es' }), 'Noticias');
  assert.equal(m.credits_libraries_summary({ shown: 3, total: 9 }, { locale: 'es' }), 'Mostrando 3 de 9');
});
