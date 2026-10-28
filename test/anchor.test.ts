import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import GithubSlugger from 'github-slugger';
import { assignAnchors, glauxAnchor } from '../src/lib/glaux/anchor.ts';
import { syncDocs } from '../src/lib/glaux/sync.ts';
import { fixtures, glauxDocs, render, tempDir } from './helpers.ts';

const real = { skip: existsSync(glauxDocs) ? false : `no Glaux docs at ${glauxDocs}` };

// The same cases as `anchors_handle_punctuation_and_unicode` in
// crates/glaux-docs/src/page/blocks/tests.rs, whose expectations Rust produced.
const cases: [string, string][] = [
  ["Don't panic", 'don-t-panic'],
  ['snake_case_name', 'snake-case-name'],
  ['A & B', 'a-b'],
  ['C++ vs. C#', 'c-vs-c'],
  ['Año nuevo', 'año-nuevo'],
  ['日本語 の 見出し', '日本語-の-見出し'],
  ['Ⅷ chapter', 'ⅷ-chapter'],
  ['½ cup', '½-cup'],
  ['İstanbul', 'i̇stanbul'],
  ['!!!', ''],
  ['--x--', 'x'],
  ['Emoji 🎮 time', 'emoji-time'],
  ['Café', 'cafe'],
  ['हिन्दी', 'हिन-दी'],
  ['Straße', 'straße'],
  ['ΣΑΣ', 'σασ'],
  ['x​y', 'x-y'],
  ['١٢٣ arabic digits', '١٢٣-arabic-digits'],
  ['Parameters', 'parameters'],
  ['The game loop', 'the-game-loop'],
  ['  A -- B! ', 'a-b'],
  ['Éxito', 'éxito'],
];

for (const [title, expected] of cases) {
  test(`the anchor of ${JSON.stringify(title)} is ${JSON.stringify(expected)}, as in Glaux`, () => {
    assert.equal(glauxAnchor(title), expected);
  });
}

test('the cases include ones Fumadocs\' own slugs would get wrong', () => {
  // Why the site does not use github-slugger: these links would miss.
  for (const title of ["Don't panic", 'snake_case_name', 'A & B']) {
    assert.notEqual(new GithubSlugger().slug(title), glauxAnchor(title), title);
  }
});

test('the first holder of an anchor keeps it and repeats get another unique id', () => {
  const { anchors, ids, title } = assignAnchors('Title', ['Same', 'Same', 'Same 2', 'Same']);
  assert.equal(title, 'title');
  assert.deepEqual(anchors, ['same', 'same-2']);
  // `same-2` is a real heading, so the repeats skip it.
  assert.deepEqual(ids, ['same', 'same-3', 'same-2', 'same-4']);
});

test('the page title counts as a heading, so a body heading repeating it cannot take its anchor', () => {
  const { anchors, ids, title } = assignAnchors('Overview', ['Overview', 'Details']);
  assert.equal(title, 'overview');
  assert.deepEqual(anchors, ['details']);
  assert.deepEqual(ids, ['overview-2', 'details']);
});

test('headings without letters or digits, and headings Glaux does not see, still get unique ids', () => {
  const { anchors, ids } = assignAnchors('T', ['!!!', '???', 'Quote'], ['Quote', 'Other']);
  assert.deepEqual(anchors, ['quote']);
  assert.deepEqual(ids, ['section', 'section-2', 'quote', 'quote-2', 'other']);
});

test('the manifest records the anchors Glaux would find, not the ones Fumadocs would make', () => {
  const manifest = syncDocs(fixtures, tempDir());
  const page = manifest.languages.en['guide/anchors'];
  assert.equal(page.title, 'Anchors & titles');
  assert.equal(page.titleAnchor, 'anchors-titles');
  // The repeated title, the repeat of `Same` and the empty heading cannot be reached from Glaux;
  // the quoted heading is not one in Glaux's eyes.
  assert.deepEqual(page.anchors, ['don-t-panic', 'snake-case-name', 'año-nuevo', 'same', 'same-2']);
});

test('the rendered headings carry the ids Glaux computes', async () => {
  const out = tempDir();
  syncDocs(fixtures, out);
  const html = await render(out, 'guide/anchors');
  const id = (text: string) => new RegExp(`<h\\d id="([^"]+)"[^>]*><a[^>]*>${text}</a>`).exec(html)?.[1];
  assert.equal(id('Don(?:\'|&#x27;)t panic'), 'don-t-panic');
  assert.equal(id('snake_case_name'), 'snake-case-name');
  assert.equal(id('Año nuevo'), 'año-nuevo');
  assert.equal(id('Same'), 'same'); // the first one
  assert.equal(id('Same 2'), 'same-2');
  assert.equal(id('Anchors &amp; titles'), 'anchors-titles-2'); // the title owns `anchors-titles`
  assert.equal(id('!!!'), 'section');
  const ids = [...html.matchAll(/<h\d id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, `ids are unique: ${ids}`);
  assert.equal(ids.length, 9);
});

test('links to headings and to the title resolve in the rendered page', async () => {
  const out = tempDir();
  syncDocs(fixtures, out);
  const html = await render(out, 'guide/anchors');
  for (const href of ['#don-t-panic', '#snake-case-name', '#año-nuevo', '#same-2', '/en/docs/guide/anchors#same']) {
    assert.ok(html.includes(`href="${href}"`), href);
  }
  // `#anchors-titles` names the title, which is not part of the body: it opens the top of the page.
  assert.ok(html.includes('href="#"'));
});

test('every heading of the manual has the id Glaux gives it, and every fragment link lands on one', real, async () => {
  const out = tempDir();
  const manifest = syncDocs(glauxDocs, out);
  let headings = 0;
  for (const [id, page] of Object.entries(manifest.languages.en)) {
    const html = await render(out, id);
    const ids = [...html.matchAll(/<h[2-6] id="([^"]+)"/g)].map((m) => m[1]);
    for (const anchor of page.anchors) assert.ok(ids.includes(anchor), `${id}: #${anchor} is not an id of the page`);
    assert.equal(new Set(ids).size, ids.length, `${id}: ids are unique`);
    headings += ids.length;
    for (const [, href] of html.matchAll(/href="([^"]*#[^"]+)"/g)) {
      const [url, fragment] = href.split('#');
      if (url === '') {
        assert.ok(ids.includes(fragment), `${id}: ${href} is not an id of the page`); // includes the headings' own links
      } else if (url.startsWith('/en/docs')) {
        const target = url.replace(/^\/en\/docs\//, '');
        const targetPage = manifest.languages.en[target] ?? manifest.languages.en[`${target}/index`];
        assert.ok(targetPage?.anchors.includes(fragment), `${id}: ${href}`);
      }
    }
  }
  assert.ok(headings > 100, `${headings} headings`);
});
