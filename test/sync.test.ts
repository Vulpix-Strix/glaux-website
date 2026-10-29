import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { syncDocs } from '../src/lib/glaux/sync.ts';
import { digest, fixtures, glauxDocs, root, tempDir, walk, writeTree } from './helpers.ts';

const haveGlaux = existsSync(glauxDocs);
const real = { skip: !haveGlaux };

test('the original docs are not modified', real, () => {
  const before = digest(glauxDocs);
  syncDocs(glauxDocs, tempDir());
  expect(digest(glauxDocs)).toBe(before);
});

test('every page of the manual is incorporated, including every published id', real, () => {
  const out = tempDir();
  const manifest = syncDocs(glauxDocs, out);
  const expected = walk(path.join(glauxDocs, 'en'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.relative(path.join(glauxDocs, 'en'), f).replace(/\.md$/, ''))
    .sort();
  expect(Object.keys(manifest.languages.en).sort()).toStrictEqual(expected);
  for (const id of expected) expect(existsSync(path.join(out, 'en', `${id}.md`)), id).toBeTruthy();

  const published = readFileSync(path.join(glauxDocs, 'ids.lock'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'));
  for (const id of published) expect(manifest.languages.en[id], `published id ${id} has no page`).toBeTruthy();
});

test('every glaux:// link of the manual resolves, with real headings for its fragments', real, () => {
  const manifest = syncDocs(glauxDocs, tempDir());
  const pages = manifest.languages.en;
  let checked = 0;
  for (const file of walk(path.join(glauxDocs, 'en'))) {
    for (const [, target] of readFileSync(file, 'utf8').matchAll(/\]\(glaux:\/\/([^)\s]+)\)/g)) {
      const [id, fragment] = target.split('#');
      expect(pages[id], `${file}: ${target}`).toBeTruthy();
      if (fragment) expect(pages[id].anchors.includes(fragment), `${file}: ${target}`).toBeTruthy();
      checked++;
    }
  }
  expect(checked > 20).toBeTruthy();
});

test('generated pages get the title as frontmatter and keep the rest of the text', () => {
  const out = tempDir();
  syncDocs(fixtures, out);
  const source = readFileSync(path.join(fixtures, 'en/api/thing.md'), 'utf8');
  const page = readFileSync(path.join(out, 'en/api/thing.md'), 'utf8');
  expect(page).toMatch(/^---\ntitle: "thing"\ndescription: "Does a thing\."\n---\n\n/);
  expect(page.endsWith(source.slice(source.indexOf('Does a thing.')))).toBeTruthy();
});

test('tables, code blocks and alerts reach the generated files untouched', () => {
  const out = tempDir();
  syncDocs(fixtures, out);
  const source = readFileSync(path.join(fixtures, 'en/guide/index.md'), 'utf8');
  const page = readFileSync(path.join(out, 'en/guide/index.md'), 'utf8');
  for (const piece of ['| `x`   | Column      |', '```luau\nlocal x = 1', '```rhai\nlet x = 1;', '> [!CAUTION]\n> Be careful.']) {
    expect(source.includes(piece) && page.includes(piece), piece).toBeTruthy();
  }
});

test('navigation lists the sections with guide first, then the pages the index lists', () => {
  const out = tempDir();
  syncDocs(fixtures, out);
  const meta = (file: string) => JSON.parse(readFileSync(path.join(out, file), 'utf8'));
  expect(meta('en/meta.json')).toStrictEqual({ pages: ['guide', 'api'] });
  // The index page is the folder's own page, so it is not listed among its children.
  expect(meta('en/guide/meta.json')).toStrictEqual({ pages: ['anchors'] });
});

test('every folder of the manual lists exactly what it holds, guide section first', real, () => {
  const out = tempDir();
  const manifest = syncDocs(glauxDocs, out);
  const lang = path.join(out, 'en');
  const folders = [lang, ...walk(lang).filter((f) => f.endsWith('.md')).map((f) => path.dirname(f))];
  for (const folder of new Set(folders)) {
    const listed = JSON.parse(readFileSync(path.join(folder, 'meta.json'), 'utf8')).pages as string[];
    const held = readdirSync(folder, { withFileTypes: true })
      .filter((e) => e.isDirectory() || (e.name.endsWith('.md') && e.name !== 'index.md'))
      .map((e) => e.name.replace(/\.md$/, ''));
    expect([...listed].sort(), folder).toStrictEqual(held.sort());
  }
  expect(JSON.parse(readFileSync(path.join(lang, 'meta.json'), 'utf8')).pages[0]).toBe('guide');
  expect([...manifest.order.en].sort()).toStrictEqual(Object.keys(manifest.languages.en).sort());
});

test('the manifest says where the documentation came from', () => {
  const manifest = syncDocs(fixtures, tempDir(), { source: { kind: 'locked', commit: 'abc' } });
  expect(manifest.source).toStrictEqual({ kind: 'locked', commit: 'abc' });
  expect(syncDocs(fixtures, tempDir()).source).toStrictEqual({ kind: 'local' });
});

test('syncing twice gives byte for byte the same files', () => {
  const [a, b] = [tempDir(), tempDir()];
  syncDocs(fixtures, a);
  syncDocs(fixtures, b);
  expect(digest(a)).toBe(digest(b));
  syncDocs(fixtures, a); // over its own earlier output
  expect(digest(a)).toBe(digest(b));
});

const english = { 'en/guide/a.md': '# A\n\nFirst.\n', 'en/guide/b.md': '# B\n\nSecond.\n' };

test('a published id without a page is an error', () => {
  const src = writeTree(tempDir(), { ...english, 'ids.lock': '# header\nguide/a\nguide/gone\n' });
  expect(() => syncDocs(src, tempDir())).toThrow(/ids\.lock: guide\/gone was published but has no en page/);
});

test('every problem is listed at once, with the file and line', () => {
  const src = writeTree(tempDir(), {
    'en/a.md': '# A\n\nSee [x](glaux://missing) and\n\n[y](glaux://a#nope).\n\n[ref]: glaux://also-missing\n',
  });
  let message = '';
  try {
    syncDocs(src, tempDir());
  } catch (error) {
    message = (error as Error).message;
  }
  expect(message).toMatch(/3 problem/);
  expect(message).toMatch(/en\/a\.md:3: .*missing/);
  expect(message).toMatch(/en\/a\.md:5: .*#nope/);
  expect(message).toMatch(/en\/a\.md:7: .*also-missing/);
});

test('a failed sync does not touch the earlier output', () => {
  const out = tempDir();
  syncDocs(fixtures, out);
  const before = digest(out);
  const src = writeTree(tempDir(), { 'en/a.md': '# A\n\n[x](glaux://missing)\n' });
  expect(() => syncDocs(src, out)).toThrow(/problem/);
  expect(digest(out)).toBe(before);
});

test('English is required, because it is the fallback', () => {
  const src = writeTree(tempDir(), { 'es/a.md': '# A\n\nHola.\n' });
  expect(() => syncDocs(src, tempDir())).toThrow(/no en\/ pages/);
});

test('a translation needs an original, and untranslated pages are reported, not copied', () => {
  const out = tempDir();
  const src = writeTree(tempDir(), { ...english, 'es/guide/a.md': '# A\n\nPrimero. Ver [b](glaux://guide/b).\n' });
  const manifest = syncDocs(src, out);
  expect(manifest.missing).toStrictEqual({ es: ['guide/b'] });
  expect(existsSync(path.join(out, 'es/guide/a.md'))).toBeTruthy();
  expect(!existsSync(path.join(out, 'es/guide/b.md')), 'English text is not passed off as Spanish').toBeTruthy();
  // The order is complete for the language, the folder file lists only what it has.
  expect(manifest.order.es).toStrictEqual(['guide/a', 'guide/b']);
  expect(JSON.parse(readFileSync(path.join(out, 'es/guide/meta.json'), 'utf8'))).toStrictEqual({ pages: ['a'] });
  expect(readFileSync(path.join(out, 'es/guide/a.md'), 'utf8')).toMatch(/^---\ntitle: "A"/);

  writeTree(src, { 'es/guide/orphan.md': '# O\n\nHuérfana.\n' });
  expect(() => syncDocs(src, tempDir())).toThrow(/es\/guide\/orphan\.md: there is no en page with this id/);
});

test('a translation may reorder what it links, using its own index', () => {
  const src = writeTree(tempDir(), {
    'en/guide/index.md': '# G\n\nGo to [a](glaux://guide/a) then [b](glaux://guide/b).\n',
    ...english,
    'es/guide/index.md': '# G\n\nVe a [b](glaux://guide/b) y luego [a](glaux://guide/a).\n',
  });
  const manifest = syncDocs(src, tempDir());
  expect(manifest.order.en).toStrictEqual(['guide/index', 'guide/a', 'guide/b']);
  expect(manifest.order.es).toStrictEqual(['guide/index', 'guide/b', 'guide/a']);
});

test('a directory it did not generate is never emptied', () => {
  const out = tempDir();
  mkdirSync(path.join(out, 'mine'));
  writeFileSync(path.join(out, 'mine/file.txt'), 'keep');
  expect(() => syncDocs(fixtures, out)).toThrow(/refusing to empty/);
  expect(existsSync(path.join(out, 'mine/file.txt'))).toBeTruthy();
});

test('a page without a title is an error', () => {
  const src = tempDir();
  mkdirSync(path.join(src, 'en'));
  writeFileSync(path.join(src, 'en/x.md'), 'No heading here.\n');
  expect(() => syncDocs(src, tempDir())).toThrow(/no level 1 heading/);
});

test('generated files are ignored by git', () => {
  for (const file of ['content/glaux/en/guide/index.md', 'content/glaux/manifest.json', '.cache/glaux-source/docs/en/guide/index.md']) {
    execFileSync('git', ['check-ignore', '-q', file], { cwd: root }); // exits 1 when not ignored
  }
});
