import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { parseEditorial, parseRon } from '../src/lib/credits/ron.ts';
import { glauxDocs } from './helpers.ts';

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
  assert.deepEqual(parseEditorial(SAMPLE), {
    sections: [
      { title: 'Created by', items: [{ type: 'message', text: 'Cuervolu' }] },
      { title: 'Special Thanks', items: [{ type: 'person', role: 'Early feedback', name: 'Madokoso, "Kalid"' }] },
    ],
    authors: { 'Zughy 32': 'Zughy' },
  });
});

test('sections and authors may be left out', () => {
  assert.deepEqual(parseEditorial('()'), { sections: [], authors: {} });
  assert.deepEqual(parseEditorial('(sections: [(title: "A")])').sections, [{ title: 'A', items: [] }]);
});

test('unknown fields and malformed items are rejected, as in Glaux', () => {
  assert.throws(() => parseEditorial('(extra: "x")'), /unknown field `extra`/);
  assert.throws(() => parseEditorial('(sections: [(title: "A", color: "red")])'), /unknown field `color` in sections\[0\]/);
  assert.throws(() => parseEditorial('(sections: [(title: "A", items: [Person(role: "R", nam: "N")])])'), /unknown field `nam`/);
  assert.throws(() => parseEditorial('(sections: [(title: "A", items: [Quote("x")])])'), /must be Person\(role, name\) or Message\(text\)/);
  assert.throws(() => parseEditorial('(sections: [(items: [])])'), /title must be a string/);
  assert.throws(() => parseEditorial('(authors: ["a"])'), /`authors` must be a map/);
});

test('syntax outside the supported subset fails with a line number', () => {
  assert.throws(() => parseRon('(sections: [\n  1,\n])'), /credits\.ron:2: unexpected `1`/);
  assert.throws(() => parseRon('(a: "open'), /unterminated string/);
  assert.throws(() => parseRon('() ()'), /unexpected text after the value/);
  assert.throws(() => parseRon('(a: "x", a: "y")'), /field `a` is set twice/);
});

test('the real credits file parses when Glaux is next to this repository', { skip: !existsSync(path.join(glauxDocs, '../rom/credits.ron')) }, () => {
  const credits = parseEditorial(readFileSync(path.join(glauxDocs, '../rom/credits.ron'), 'utf8'));
  assert.ok(credits.sections.length > 0);
});
