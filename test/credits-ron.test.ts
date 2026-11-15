import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { parseEditorial, parseRon } from '@/lib/credits/ron';
import { glauxCredits } from './helpers.ts';

const SAMPLE = `// Editorial credits.
(
    sections: [
        (
            title: "Created by",
            items: [
                Message("Cuervolu"), /* inline */
            ],
        ),
        (
            title: "Special Thanks",
            items: [
                Person(role: "Early feedback", name: "Madokoso, \\"Kalid\\""),
            ],
        ),
    ],
    authors: {
        "Zughy 32": "Zughy",
    },
)
`;

test('the editorial credits are read the way Glaux reads them', () => {
  expect(parseEditorial(SAMPLE)).toStrictEqual({
    sections: [
      { title: 'Created by', items: [{ type: 'message', text: 'Cuervolu' }] },
      { title: 'Special Thanks', items: [{ type: 'person', role: 'Early feedback', name: 'Madokoso, "Kalid"' }] },
    ],
    authors: { 'Zughy 32': 'Zughy' },
  });
});

test('sections and authors may be left out', () => {
  expect(parseEditorial('()')).toStrictEqual({ sections: [], authors: {} });
  expect(parseEditorial('(sections: [(title: "A")])').sections).toStrictEqual([{ title: 'A', items: [] }]);
});

test('unknown fields and malformed items are rejected, as in Glaux', () => {
  expect(() => parseEditorial('(extra: "x")')).toThrow(/unknown field `extra`/);
  expect(() => parseEditorial('(sections: [(title: "A", color: "red")])')).toThrow(/unknown field `color` in sections\[0\]/);
  expect(() => parseEditorial('(sections: [(title: "A", items: [Person(role: "R", nam: "N")])])')).toThrow(/unknown field `nam`/);
  expect(() => parseEditorial('(sections: [(title: "A", items: [Quote("x")])])')).toThrow(/must be Person\(role, name\) or Message\(text\)/);
  expect(() => parseEditorial('(sections: [(items: [])])')).toThrow(/title must be a string/);
  expect(() => parseEditorial('(authors: ["a"])')).toThrow(/`authors` must be a map/);
});

test('syntax outside the supported subset fails with a line number', () => {
  expect(() => parseRon('(sections: [\n  1,\n])')).toThrow(/credits\.ron:2: unexpected `1`/);
  expect(() => parseRon('(a: "open')).toThrow(/unterminated string/);
  expect(() => parseRon('() ()')).toThrow(/unexpected text after the value/);
  expect(() => parseRon('(a: "x", a: "y")')).toThrow(/field `a` is set twice/);
});

test('the real credits file of the published version parses', { skip: !existsSync(path.join(glauxCredits, 'rom/credits.ron')) }, () => {
  const credits = parseEditorial(readFileSync(path.join(glauxCredits, 'rom/credits.ron'), 'utf8'));
  expect(credits.sections.length > 0).toBeTruthy();
});
