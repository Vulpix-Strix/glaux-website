import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
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
    expect(Object.keys(messages).sort(), locale).toStrictEqual(Object.keys(base).sort());
    for (const [key, text] of Object.entries(messages)) {
      expect(text.trim(), `${locale}: ${key} is empty`).toBeTruthy();
      expect(!text.includes('[POST'), `${locale}: ${key} has a placeholder`).toBeTruthy();
      expect(placeholders(text), `${locale}: ${key}`).toStrictEqual(placeholders(base[key]));
    }
  }
});

test('messages follow an explicit locale, whatever the current one is', () => {
  expect(m.editorial_news({}, { locale: 'en' })).toBe('News');
  expect(m.editorial_news({}, { locale: 'es' })).toBe('Noticias');
  expect(m.credits_libraries_summary({ shown: 3, total: 9 }, { locale: 'es' })).toBe('Mostrando 3 de 9');
});
