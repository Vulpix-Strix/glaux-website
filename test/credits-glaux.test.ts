import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildGlauxFiles, mergeInventories, parseInventory } from '../src/lib/credits/glaux.ts';

const inventory = (texts: object[], entries: object[]) => JSON.stringify({ texts, entries });
const text = (title: string) => ({ kind: 'license', title, spdx: 'MIT', content: `${title} text` });
const entry = (name: string, category: string, text_ids: number[], extra: object = {}) => ({ name, version: '1.0.0', license: 'MIT', repository: `https://example.com/${name}`, category, text_ids, ...extra });

test('a Glaux inventory is checked for the things the website relies on', () => {
  assert.throws(() => parseInventory('{}', 'x.json'), /needs `texts` and `entries`/);
  assert.throws(() => parseInventory(inventory([text('A')], [entry('a', 'library', [1])]), 'x.json'), /a\) points at a text that does not exist/);
  assert.throws(() => parseInventory(inventory([{ ...text('A'), kind: 'poem' }], []), 'x.json'), /unknown kind `poem`/);
  assert.throws(() => parseInventory(inventory([text('A')], [entry('a', 'library', [0], { name: 7 })]), 'x.json'), /name must be a string/);
});

test('a crate without a repository is read as having none', () => {
  const parsed = parseInventory(inventory([text('A')], [entry('a', 'library', [0], { repository: null })]), 'x.json');
  assert.equal('repository' in parsed.entries[0], false);
});

test('the extra inventory is appended the way Glaux appends it', () => {
  const base = parseInventory(inventory([text('A'), text('B')], [entry('a', 'library', [1])]), 'a.json');
  const extra = parseInventory(inventory([text('C')], [entry('c', 'native', [0])]), 'b.json');
  const merged = mergeInventories(base, extra);
  assert.deepEqual(merged.texts.map((t) => t.title), ['A', 'B', 'C']);
  assert.deepEqual(merged.entries.map((e) => e.text_ids), [[1], [2]]);
});

const credits = '(sections: [(title: "Created by", items: [Message("Cuervolu")])], authors: {"Pixel Code": "Qwerasd"})';
const files = (editorial = credits) => ({
  editorial,
  thirdParty: inventory([text('A')], [entry('serde', 'library', [0])]),
  extra: inventory([text('Font'), text('Luau')], [entry('Pixel Code', 'art', [0]), entry('Luau', 'native', [1])]),
});
const source = { repository: 'https://example.com/glaux.git', commit: 'a'.repeat(40) };

test('Glaux credits become an editorial file, an index per kind and one file of texts', () => {
  const out = buildGlauxFiles(files(), source);
  assert.deepEqual(Object.keys(out), ['editorial.json', 'glaux.json', 'glaux-texts.json']);
  assert.deepEqual(out['editorial.json'].sections, [{ title: 'Created by', items: [{ type: 'message', text: 'Cuervolu' }] }]);
  assert.deepEqual(out['editorial.json'].art.map((a) => [a.name, a.author, a.text_ids]), [['Pixel Code', 'Qwerasd', [1]]]);
  assert.deepEqual(out['glaux.json'].libraries.map((e) => e.name), ['serde']);
  assert.deepEqual(out['glaux.json'].native.map((e) => [e.name, e.text_ids]), [['Luau', [2]]]);
  assert.equal(out['glaux.json'].source, source);
  assert.deepEqual(out['glaux-texts.json'].texts.map((t) => t.title), ['A', 'Font', 'Luau']);
  assert.ok(!('texts' in out['glaux.json']), 'indexes hold no license text');
});

test('an author for something that is not bundled art is an error, as it is a typo', () => {
  assert.throws(() => buildGlauxFiles(files('(authors: {"Nope": "X"})'), source), /author for `Nope`/);
});

test('an unknown category is an error instead of a missing row', () => {
  const bad = { ...files(), extra: inventory([text('A')], [entry('x', 'tool', [0])]) };
  assert.throws(() => buildGlauxFiles(bad, source), /unknown category `tool`/);
});
