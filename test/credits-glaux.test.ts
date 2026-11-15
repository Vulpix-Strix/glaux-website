import { expect, test } from 'vitest';
import { buildGlauxFiles, mergeInventories, parseInventory } from '@/lib/credits/glaux';

const inventory = (texts: object[], entries: object[]) => JSON.stringify({ texts, entries });
const text = (title: string) => ({ kind: 'license', title, spdx: 'MIT', content: `${title} text` });
const entry = (name: string, category: string, text_ids: number[], extra: object = {}) => ({ name, version: '1.0.0', license: 'MIT', repository: `https://example.com/${name}`, category, text_ids, ...extra });

test('a Glaux inventory is checked for the things the website relies on', () => {
  expect(() => parseInventory('{}', 'x.json')).toThrow(/needs `texts` and `entries`/);
  expect(() => parseInventory(inventory([text('A')], [entry('a', 'library', [1])]), 'x.json')).toThrow(/a\) points at a text that does not exist/);
  expect(() => parseInventory(inventory([{ ...text('A'), kind: 'poem' }], []), 'x.json')).toThrow(/unknown kind `poem`/);
  expect(() => parseInventory(inventory([text('A')], [entry('a', 'library', [0], { name: 7 })]), 'x.json')).toThrow(/name must be a string/);
});

test('a crate without a repository is read as having none', () => {
  const parsed = parseInventory(inventory([text('A')], [entry('a', 'library', [0], { repository: null })]), 'x.json');
  expect('repository' in parsed.entries[0]).toBe(false);
});

test('the extra inventory is appended the way Glaux appends it', () => {
  const base = parseInventory(inventory([text('A'), text('B')], [entry('a', 'library', [1])]), 'a.json');
  const extra = parseInventory(inventory([text('C')], [entry('c', 'native', [0])]), 'b.json');
  const merged = mergeInventories(base, extra);
  expect(merged.texts.map((t) => t.title)).toStrictEqual(['A', 'B', 'C']);
  expect(merged.entries.map((e) => e.text_ids)).toStrictEqual([[1], [2]]);
});

const credits = '(sections: [(title: "Created by", items: [Message("Cuervolu")])], authors: {"Pixel Code": "Qwerasd"})';
const files = (editorial = credits) => ({
  editorial,
  thirdParty: inventory([text('A')], [entry('serde', 'library', [0])]),
  extra: inventory([text('Font'), text('Luau')], [entry('Pixel Code', 'art', [0]), entry('Luau', 'native', [1])]),
});
const source = { repository: 'https://example.com/glaux.git', commit: 'a'.repeat(40), version: 'development' };

test('Glaux credits become an editorial file, an index per kind and one file of texts', () => {
  const out = buildGlauxFiles(files(), source);
  expect(Object.keys(out)).toStrictEqual(['editorial.json', 'glaux.json', 'glaux-texts.json']);
  expect(out['editorial.json'].sections).toStrictEqual([{ title: 'Created by', items: [{ type: 'message', text: 'Cuervolu' }] }]);
  expect(out['editorial.json'].art.map((a) => [a.name, a.author, a.text_ids])).toStrictEqual([['Pixel Code', 'Qwerasd', [1]]]);
  expect(out['glaux.json'].libraries.map((e) => e.name)).toStrictEqual(['serde']);
  expect(out['glaux.json'].native.map((e) => [e.name, e.text_ids])).toStrictEqual([['Luau', [2]]]);
  expect(out['glaux.json'].source).toBe(source);
  expect(out['glaux-texts.json'].texts.map((t) => t.title)).toStrictEqual(['A', 'Font', 'Luau']);
  expect(!('texts' in out['glaux.json']), 'indexes hold no license text').toBeTruthy();
});

test('an author for something that is not bundled art is an error, as it is a typo', () => {
  expect(() => buildGlauxFiles(files('(authors: {"Nope": "X"})'), source)).toThrow(/author for `Nope`/);
});

test('an unknown category is an error instead of a missing row', () => {
  const bad = { ...files(), extra: inventory([text('A')], [entry('x', 'tool', [0])]) };
  expect(() => buildGlauxFiles(bad, source)).toThrow(/unknown category `tool`/);
});
