import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { familyCounts, filterEntries, licenseFamilies, licenseFamily } from '@/lib/credits/browse';
import { m } from '@/paraglide/messages';
import { pageHead } from '@/lib/landing/metadata';
import { root } from './helpers.ts';

const read = (name: string) => JSON.parse(readFileSync(path.join(root, 'public/credits', name), 'utf8'));
const npm = read('npm.json').entries;
const glaux = read('glaux.json');

test('licenses are grouped by what a reader would check first', () => {
  expect(licenseFamily('MIT')).toBe('mit');
  expect(licenseFamily('Apache-2.0')).toBe('apache');
  expect(licenseFamily('MIT OR Apache-2.0')).toBe('mitApache');
  expect(licenseFamily('Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT')).toBe('mitApache');
  expect(licenseFamily('LGPL-3.0-or-later')).toBe('copyleft');
  expect(licenseFamily('MPL-2.0')).toBe('copyleft');
  expect(licenseFamily('ISC')).toBe('other');
  expect(licenseFamily('')).toBe('other');
});

test('family counts add up to the entries that match the query', () => {
  for (const entries of [glaux.libraries, glaux.native, npm]) {
    for (const query of ['', 'a', 'babel']) {
      const counts = familyCounts(entries, query);
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(filterEntries(entries, query, 'all').length);
      for (const family of licenseFamilies) expect(filterEntries(entries, query, family).length).toBe(counts[family]);
    }
  }
});

test('search matches names and npm authors, ignoring case', () => {
  expect(filterEntries(npm, 'BABEL', 'all').length > 0).toBeTruthy();
  expect(filterEntries(npm, 'the babel team', 'all').length > 0).toBeTruthy();
  expect(filterEntries(glaux.libraries, 'no such crate', 'all').length).toBe(0);
});

test('credits heads point at /credits in both languages', () => {
  const head = pageHead('es', '/credits', {
    title: m.credits_title({}, { locale: 'es' }),
    description: m.credits_description({}, { locale: 'es' }),
  });
  expect(head.links.some((link) => link.rel === 'canonical' && link.href === 'https://glauxconsole.dev/es/credits')).toBeTruthy();
  expect(head.links.some((link) => link.hrefLang === 'x-default' && link.href === 'https://glauxconsole.dev/en/credits')).toBeTruthy();
});
