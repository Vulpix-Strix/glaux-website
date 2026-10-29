import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { familyCounts, filterEntries, licenseFamilies, licenseFamily } from '@/lib/credits/browse.ts';
import { creditsCopy } from '@/lib/credits/copy.ts';
import { pageHead } from '@/lib/landing/metadata.ts';
import { root } from './helpers.ts';

const read = (name: string) => JSON.parse(readFileSync(path.join(root, 'public/credits', name), 'utf8'));
const npm = read('npm.json').entries;
const glaux = read('glaux.json');

test('licenses are grouped by what a reader would check first', () => {
  assert.equal(licenseFamily('MIT'), 'mit');
  assert.equal(licenseFamily('Apache-2.0'), 'apache');
  assert.equal(licenseFamily('MIT OR Apache-2.0'), 'mitApache');
  assert.equal(licenseFamily('Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT'), 'mitApache');
  assert.equal(licenseFamily('LGPL-3.0-or-later'), 'copyleft');
  assert.equal(licenseFamily('MPL-2.0'), 'copyleft');
  assert.equal(licenseFamily('ISC'), 'other');
  assert.equal(licenseFamily(''), 'other');
});

test('family counts add up to the entries that match the query', () => {
  for (const entries of [glaux.libraries, glaux.native, npm]) {
    for (const query of ['', 'a', 'babel']) {
      const counts = familyCounts(entries, query);
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
      assert.equal(total, filterEntries(entries, query, 'all').length);
      for (const family of licenseFamilies) assert.equal(filterEntries(entries, query, family).length, counts[family]);
    }
  }
});

test('search matches names and npm authors, ignoring case', () => {
  assert.ok(filterEntries(npm, 'BABEL', 'all').length > 0);
  assert.ok(filterEntries(npm, 'the babel team', 'all').length > 0);
  assert.equal(filterEntries(glaux.libraries, 'no such crate', 'all').length, 0);
});

test('credits copy has the same keys in both languages and heads point at /credits', () => {
  const keys = (value: unknown, prefix = ''): string[] =>
    typeof value === 'object' && value !== null ? Object.entries(value).flatMap(([key, item]) => keys(item, `${prefix}.${key}`)) : [prefix];
  assert.deepEqual(keys(creditsCopy.en).sort(), keys(creditsCopy.es).sort());
  const head = pageHead('es', '/credits', creditsCopy.es);
  assert.ok(head.links.some((link) => link.rel === 'canonical' && link.href === 'https://glauxconsole.dev/es/credits'));
  assert.ok(head.links.some((link) => link.hrefLang === 'x-default' && link.href === 'https://glauxconsole.dev/en/credits'));
});
