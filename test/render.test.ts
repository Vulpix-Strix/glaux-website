import { expect, test } from 'vitest';
import path from 'node:path';
import { syncDocs } from '@/lib/glaux/sync';
import { fixtures, render, tempDir, writeTree } from './helpers.ts';

const out = tempDir();
syncDocs(fixtures, out);

test('Fumadocs renders tables, code, lists and quotes from plain Markdown', async () => {
  const html = await render(out, 'guide/index');
  expect(html).toMatch(/<table/);
  expect(html).toMatch(/<th[^>]*>Name<\/th>/);
  expect(html.match(/<pre/g)?.length).toBe(2);
  expect(html).toMatch(/<ol/);
  expect(html).toMatch(/<ul/);
  expect(html).toMatch(/<code[^>]*>inline code<\/code>/);
  expect(html).toMatch(/<blockquote[^>]*>[^]*A plain quote\./);
  expect(html).toMatch(/<hr/);
  expect(html).toMatch(/<h3 id="nested-heading"/);
  expect(html).toMatch(/<img[^>]*alt="Alt text for the logo"/);
  expect(html).toMatch(/<img[^>]*alt="A local dot"/);
});

/** The light-theme color of the token with this text in the first code block of `html` that has it. */
const tokenColor = (html: string, token: string) =>
  new RegExp(`--shiki-light:(#[0-9A-Fa-f]{6})[^"]*"[^>]*>${token}</span>`).exec(html)?.[1];

test('Luau and Rhai blocks are highlighted with their own grammars', async () => {
  const html = await render(withBlocks('```luau\nlocal t = {a = 1}\n```\n\n```rhai\nswitch x { 1 => print("a"), _ => () }\nlet m = #{ a: 1 };\n```'), 'a');
  expect(html).not.toMatch(/Language `\w+` is not/);
  const keyword = tokenColor(html, 'local');
  expect(keyword && keyword !== tokenColor(html, 't'), 'Luau keywords are colored').toBeTruthy();
  // `switch` is Rhai but not Rust, so Rust's grammar (the old stand-in) left it as plain text.
  expect(tokenColor(html, 'switch')).toBe(keyword);
  expect(tokenColor(html, 'let')).toBe(keyword);
});

test('all five GFM alerts become callouts and no marker text is left', async () => {
  const html = await render(out, 'guide/index');
  for (const text of ['A note.', 'A tip.', 'Something important.', 'A warning.', 'Be careful.']) {
    expect(html.includes(text), text).toBeTruthy();
  }
  for (const title of ['Note', 'Tip', 'Important', 'Warning', 'Caution']) {
    expect(html, title).toMatch(new RegExp(`>${title}<`));
  }
  expect(html).not.toMatch(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/);
  // A plain quote stays a blockquote.
  expect(html.match(/<blockquote/g)?.length).toBe(1);
});

test('links are rewritten in the rendered page', async () => {
  const html = await render(out, 'guide/index');
  expect(html).toMatch(/href="\/en\/docs\/api\/thing"/);
  expect(html).toMatch(/href="\/en\/docs\/api\/thing#parameters"/);
  expect(html).toMatch(/href="#nested-heading"/);
  expect(html).toMatch(/href="https:\/\/example\.com\/docs"/);
  expect(html).toMatch(/href="mailto:hi@example\.com"/);
  expect(html).not.toMatch(/glaux:\/\//);
});

test('a broken glaux:// link fails the compilation of the page, even when the sync step missed it', async () => {
  const dir = withBlocks('```rhai\nlet x = 1;\n```');
  const page = path.join(dir, 'en/a.md');
  const { readFileSync, writeFileSync } = await import('node:fs');
  const original = readFileSync(page, 'utf8');

  writeFileSync(page, original + '\nSee [x](glaux://api/missing).\n');
  await expect(render(dir, 'a')).rejects.toThrow(/no page with id api\/missing/);

  writeFileSync(page, original + '\nSee [x](glaux://a#nope).\n');
  await expect(render(dir, 'a')).rejects.toThrow(/no heading with anchor #nope/);

  // Headings that changed since the sync step would make ids and manifest disagree.
  writeFileSync(page, original + '\n## Added later\n');
  await expect(render(dir, 'a')).rejects.toThrow(/do not match the anchors recorded by the sync step/);
});

function withBlocks(markdown: string): string {
  const src = tempDir();
  writeTree(src, { 'en/a.md': `# A\n\nText.\n\n${markdown}\n` });
  const dir = tempDir();
  syncDocs(src, dir);
  return dir;
}
