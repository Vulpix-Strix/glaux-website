import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { syncDocs } from '../src/lib/glaux/sync.ts';
import { fixtures, render, tempDir, writeTree } from './helpers.ts';

const out = tempDir();
syncDocs(fixtures, out);

test('Fumadocs renders tables, code, lists and quotes from plain Markdown', async () => {
  const html = await render(out, 'guide/index');
  assert.match(html, /<table/);
  assert.match(html, /<th[^>]*>Name<\/th>/);
  assert.equal(html.match(/<pre/g)?.length, 2);
  assert.match(html, /<ol/);
  assert.match(html, /<ul/);
  assert.match(html, /<code[^>]*>inline code<\/code>/);
  assert.match(html, /<blockquote[^>]*>[^]*A plain quote\./);
  assert.match(html, /<hr/);
  assert.match(html, /<h3 id="nested-heading"/);
  assert.match(html, /<img[^>]*alt="Alt text for the logo"/);
  assert.match(html, /<img[^>]*alt="A local dot"/);
});

/** The light-theme color of the token with this text in the first code block of `html` that has it. */
const tokenColor = (html: string, token: string) =>
  new RegExp(`--shiki-light:(#[0-9A-Fa-f]{6})[^"]*"[^>]*>${token}</span>`).exec(html)?.[1];

test('Luau and Rhai blocks are highlighted with their own grammars', async () => {
  const html = await render(withBlocks('```luau\nlocal t = {a = 1}\n```\n\n```rhai\nswitch x { 1 => print("a"), _ => () }\nlet m = #{ a: 1 };\n```'), 'a');
  assert.doesNotMatch(html, /Language `\w+` is not/);
  const keyword = tokenColor(html, 'local');
  assert.ok(keyword && keyword !== tokenColor(html, 't'), 'Luau keywords are colored');
  // `switch` is Rhai but not Rust, so Rust's grammar (the old stand-in) left it as plain text.
  assert.equal(tokenColor(html, 'switch'), keyword);
  assert.equal(tokenColor(html, 'let'), keyword);
});

test('all five GFM alerts become callouts and no marker text is left', async () => {
  const html = await render(out, 'guide/index');
  for (const text of ['A note.', 'A tip.', 'Something important.', 'A warning.', 'Be careful.']) {
    assert.ok(html.includes(text), text);
  }
  for (const title of ['Note', 'Tip', 'Important', 'Warning', 'Caution']) {
    assert.match(html, new RegExp(`>${title}<`), title);
  }
  assert.doesNotMatch(html, /\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/);
  // A plain quote stays a blockquote.
  assert.equal(html.match(/<blockquote/g)?.length, 1);
});

test('links are rewritten in the rendered page', async () => {
  const html = await render(out, 'guide/index');
  assert.match(html, /href="\/en\/docs\/api\/thing"/);
  assert.match(html, /href="\/en\/docs\/api\/thing#parameters"/);
  assert.match(html, /href="#nested-heading"/);
  assert.match(html, /href="https:\/\/example\.com\/docs"/);
  assert.match(html, /href="mailto:hi@example\.com"/);
  assert.doesNotMatch(html, /glaux:\/\//);
});

test('a broken glaux:// link fails the compilation of the page, even when the sync step missed it', async () => {
  const dir = withBlocks('```rhai\nlet x = 1;\n```');
  const page = path.join(dir, 'en/a.md');
  const { readFileSync, writeFileSync } = await import('node:fs');
  const original = readFileSync(page, 'utf8');

  writeFileSync(page, original + '\nSee [x](glaux://api/missing).\n');
  await assert.rejects(render(dir, 'a'), /no page with id api\/missing/);

  writeFileSync(page, original + '\nSee [x](glaux://a#nope).\n');
  await assert.rejects(render(dir, 'a'), /no heading with anchor #nope/);

  // Headings that changed since the sync step would make ids and manifest disagree.
  writeFileSync(page, original + '\n## Added later\n');
  await assert.rejects(render(dir, 'a'), /do not match the anchors recorded by the sync step/);
});

function withBlocks(markdown: string): string {
  const src = tempDir();
  writeTree(src, { 'en/a.md': `# A\n\nText.\n\n${markdown}\n` });
  const dir = tempDir();
  syncDocs(src, dir);
  return dir;
}
