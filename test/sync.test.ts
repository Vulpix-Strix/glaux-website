import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { syncDocs } from '../src/lib/glaux/sync.ts';
import { digest, fixtures, glauxDocs, root, tempDir, walk, writeTree } from './helpers.ts';

const haveGlaux = existsSync(glauxDocs);
const real = { skip: haveGlaux ? false : `no Glaux docs at ${glauxDocs}` };

test('the original docs are not modified', real, () => {
  const before = digest(glauxDocs);
  syncDocs(glauxDocs, tempDir());
  assert.equal(digest(glauxDocs), before);
});

test('every page of the manual is incorporated, including every published id', real, () => {
  const out = tempDir();
  const manifest = syncDocs(glauxDocs, out);
  const expected = walk(path.join(glauxDocs, 'en'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.relative(path.join(glauxDocs, 'en'), f).replace(/\.md$/, ''))
    .sort();
  assert.deepEqual(Object.keys(manifest.languages.en).sort(), expected);
  for (const id of expected) assert.ok(existsSync(path.join(out, 'en', `${id}.md`)), id);

  const published = readFileSync(path.join(glauxDocs, 'ids.lock'), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'));
  for (const id of published) assert.ok(manifest.languages.en[id], `published id ${id} has no page`);
});

test('every glaux:// link of the manual resolves, with real headings for its fragments', real, () => {
  const manifest = syncDocs(glauxDocs, tempDir());
  const pages = manifest.languages.en;
  let checked = 0;
  for (const file of walk(path.join(glauxDocs, 'en'))) {
    for (const [, target] of readFileSync(file, 'utf8').matchAll(/\]\(glaux:\/\/([^)\s]+)\)/g)) {
      const [id, fragment] = target.split('#');
      assert.ok(pages[id], `${file}: ${target}`);
      if (fragment) assert.ok(pages[id].anchors.includes(fragment), `${file}: ${target}`);
      checked++;
    }
  }
  assert.ok(checked > 20);
});

test('generated pages get the title as frontmatter and keep the rest of the text', () => {
  const out = tempDir();
  syncDocs(fixtures, out);
  const source = readFileSync(path.join(fixtures, 'en/api/thing.md'), 'utf8');
  const page = readFileSync(path.join(out, 'en/api/thing.md'), 'utf8');
  assert.match(page, /^---\ntitle: "thing"\ndescription: "Does a thing\."\n---\n\n/);
  assert.ok(page.endsWith(source.slice(source.indexOf('Does a thing.'))));
});

test('tables, code blocks and alerts reach the generated files untouched', () => {
  const out = tempDir();
  syncDocs(fixtures, out);
  const source = readFileSync(path.join(fixtures, 'en/guide/index.md'), 'utf8');
  const page = readFileSync(path.join(out, 'en/guide/index.md'), 'utf8');
  for (const piece of ['| `x`   | Column      |', '```luau\nlocal x = 1', '```rhai\nlet x = 1;', '> [!CAUTION]\n> Be careful.']) {
    assert.ok(source.includes(piece) && page.includes(piece), piece);
  }
});

test('navigation lists the sections with guide first, then the pages the index lists', () => {
  const out = tempDir();
  syncDocs(fixtures, out);
  const meta = (file: string) => JSON.parse(readFileSync(path.join(out, file), 'utf8'));
  assert.deepEqual(meta('en/meta.json'), { pages: ['guide', 'api'] });
  // The index page is the folder's own page, so it is not listed among its children.
  assert.deepEqual(meta('en/guide/meta.json'), { pages: ['anchors'] });
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
    assert.deepEqual([...listed].sort(), held.sort(), folder);
  }
  assert.equal(JSON.parse(readFileSync(path.join(lang, 'meta.json'), 'utf8')).pages[0], 'guide');
  assert.deepEqual([...manifest.order.en].sort(), Object.keys(manifest.languages.en).sort());
});

test('the manifest says where the documentation came from', () => {
  const manifest = syncDocs(fixtures, tempDir(), { source: { kind: 'locked', commit: 'abc' } });
  assert.deepEqual(manifest.source, { kind: 'locked', commit: 'abc' });
  assert.deepEqual(syncDocs(fixtures, tempDir()).source, { kind: 'local' });
});

test('syncing twice gives byte for byte the same files', () => {
  const [a, b] = [tempDir(), tempDir()];
  syncDocs(fixtures, a);
  syncDocs(fixtures, b);
  assert.equal(digest(a), digest(b));
  syncDocs(fixtures, a); // over its own earlier output
  assert.equal(digest(a), digest(b));
});

const english = { 'en/guide/a.md': '# A\n\nFirst.\n', 'en/guide/b.md': '# B\n\nSecond.\n' };

test('a published id without a page is an error', () => {
  const src = writeTree(tempDir(), { ...english, 'ids.lock': '# header\nguide/a\nguide/gone\n' });
  assert.throws(() => syncDocs(src, tempDir()), /ids\.lock: guide\/gone was published but has no en page/);
});

test('every problem is listed at once, with the file and line', () => {
  const src = writeTree(tempDir(), {
    'en/a.md': '# A\n\nSee [x](glaux://missing) and\n\n[y](glaux://a#nope).\n\n[ref]: glaux://also-missing\n',
  });
  assert.throws(
    () => syncDocs(src, tempDir()),
    (error: Error) =>
      /3 problem/.test(error.message) &&
      /en\/a\.md:3: .*missing/.test(error.message) &&
      /en\/a\.md:5: .*#nope/.test(error.message) &&
      /en\/a\.md:7: .*also-missing/.test(error.message),
  );
});

test('a failed sync does not touch the earlier output', () => {
  const out = tempDir();
  syncDocs(fixtures, out);
  const before = digest(out);
  const src = writeTree(tempDir(), { 'en/a.md': '# A\n\n[x](glaux://missing)\n' });
  assert.throws(() => syncDocs(src, out), /problem/);
  assert.equal(digest(out), before);
});

test('English is required, because it is the fallback', () => {
  const src = writeTree(tempDir(), { 'es/a.md': '# A\n\nHola.\n' });
  assert.throws(() => syncDocs(src, tempDir()), /no en\/ pages/);
});

test('a translation needs an original, and untranslated pages are reported, not copied', () => {
  const out = tempDir();
  const src = writeTree(tempDir(), { ...english, 'es/guide/a.md': '# A\n\nPrimero. Ver [b](glaux://guide/b).\n' });
  const manifest = syncDocs(src, out);
  assert.deepEqual(manifest.missing, { es: ['guide/b'] });
  assert.ok(existsSync(path.join(out, 'es/guide/a.md')));
  assert.ok(!existsSync(path.join(out, 'es/guide/b.md')), 'English text is not passed off as Spanish');
  // The order is complete for the language, the folder file lists only what it has.
  assert.deepEqual(manifest.order.es, ['guide/a', 'guide/b']);
  assert.deepEqual(JSON.parse(readFileSync(path.join(out, 'es/guide/meta.json'), 'utf8')), { pages: ['a'] });
  assert.match(readFileSync(path.join(out, 'es/guide/a.md'), 'utf8'), /^---\ntitle: "A"/);

  writeTree(src, { 'es/guide/orphan.md': '# O\n\nHuérfana.\n' });
  assert.throws(() => syncDocs(src, tempDir()), /es\/guide\/orphan\.md: there is no en page with this id/);
});

test('a translation may reorder what it links, using its own index', () => {
  const src = writeTree(tempDir(), {
    'en/guide/index.md': '# G\n\nGo to [a](glaux://guide/a) then [b](glaux://guide/b).\n',
    ...english,
    'es/guide/index.md': '# G\n\nVe a [b](glaux://guide/b) y luego [a](glaux://guide/a).\n',
  });
  const manifest = syncDocs(src, tempDir());
  assert.deepEqual(manifest.order.en, ['guide/index', 'guide/a', 'guide/b']);
  assert.deepEqual(manifest.order.es, ['guide/index', 'guide/b', 'guide/a']);
});

test('a directory it did not generate is never emptied', () => {
  const out = tempDir();
  mkdirSync(path.join(out, 'mine'));
  writeFileSync(path.join(out, 'mine/file.txt'), 'keep');
  assert.throws(() => syncDocs(fixtures, out), /refusing to empty/);
  assert.ok(existsSync(path.join(out, 'mine/file.txt')));
});

test('a page without a title is an error', () => {
  const src = tempDir();
  mkdirSync(path.join(src, 'en'));
  writeFileSync(path.join(src, 'en/x.md'), 'No heading here.\n');
  assert.throws(() => syncDocs(src, tempDir()), /no level 1 heading/);
});

test('generated files are ignored by git', () => {
  for (const file of ['content/glaux/en/guide/index.md', 'content/glaux/manifest.json', '.cache/glaux-source/docs/en/guide/index.md']) {
    execFileSync('git', ['check-ignore', '-q', file], { cwd: root }); // exits 1 when not ignored
  }
});
