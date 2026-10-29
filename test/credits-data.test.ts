import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { OUT_DIR, OVERRIDES_FILE, OVERRIDES_TEXTS } from '../src/lib/credits/generate.ts';
import { root } from './helpers.ts';

// What is committed in public/credits. That it matches the sources is `pnpm credits:check`.
const read = (name: string) => JSON.parse(readFileSync(path.join(root, OUT_DIR, name), 'utf8'));
const npm = read('npm.json');
const npmTexts = read('npm-texts.json').texts;
const glaux = read('glaux.json');
const glauxTexts = read('glaux-texts.json').texts;
const editorial = read('editorial.json');

test('every entry points at texts that exist', () => {
  const check = (entries: { name: string; text_ids: number[] }[], texts: unknown[]) => {
    for (const entry of entries) {
      assert.ok(entry.text_ids.length > 0, `${entry.name} has no license text`);
      assert.ok(entry.text_ids.every((id) => Number.isInteger(id) && id >= 0 && id < texts.length), `${entry.name} points outside its texts`);
    }
  };
  check(npm.entries, npmTexts);
  check([...glaux.libraries, ...glaux.native, ...editorial.art], glauxTexts);
});

test('no entry has a license identifier in place of a license text', () => {
  for (const text of npmTexts) {
    assert.ok(text.content.trim().split(/\s+/).length > 15, `${text.title}: too short to be a license text or a notice`);
    assert.notEqual(text.content.trim(), text.spdx);
  }
});

test('the npm inventory holds runtime packages and build tools, and says what it left out', () => {
  assert.equal(npm.platform, 'linux-x64-glibc');
  assert.ok(npm.entries.some((entry: { scope: string }) => entry.scope === 'runtime'));
  assert.ok(npm.entries.some((entry: { scope: string }) => entry.scope === 'dev'));
  assert.ok(npm.entries.every((entry: { scope: string; direct: boolean }) => ['runtime', 'dev'].includes(entry.scope) && typeof entry.direct === 'boolean'));
  for (const name of ['react', 'fumadocs-core', 'vite', 'typescript']) assert.ok(npm.entries.some((entry: { name: string }) => entry.name === name), `${name} is missing`);
  // Left out because pnpm never installs them on the reference platform, whichever machine ran the sync.
  assert.ok(npm.omitted.includes('fsevents@2.3.3'));
  assert.ok(npm.omitted.every((id: string) => !npm.entries.some((entry: { name: string; version: string }) => `${entry.name}@${entry.version}` === id)));
});

test('the generated files hold nothing from the machine that made them', () => {
  for (const name of ['npm.json', 'npm-texts.json', 'glaux.json', 'glaux-texts.json', 'editorial.json']) {
    const text = readFileSync(path.join(root, OUT_DIR, name), 'utf8');
    assert.ok(!/\/Users\/|\/home\/|\.pnpm/.test(text), `${name} contains a local path`);
  }
});

test('indexes are separate from texts, so a page can load the texts later', () => {
  assert.ok(npm.entries.every((entry: object) => !('content' in entry)));
  assert.ok(glaux.libraries.every((entry: object) => !('content' in entry)));
  assert.deepEqual(Object.keys(read('npm-texts.json')), ['texts']);
});

test('the Glaux data records the commit it was read from', () => {
  assert.match(glaux.source.commit, /^[0-9a-f]{40}$/);
});

test('every override keeps a pinned official source and the text it points at', () => {
  const overrides = JSON.parse(readFileSync(path.join(root, OVERRIDES_FILE), 'utf8')).npm;
  for (const [pkg, texts] of Object.entries<{ file: string; source: string }[]>(overrides)) {
    for (const text of texts) {
      assert.ok(existsSync(path.join(root, OVERRIDES_TEXTS, text.file)), `${pkg}: ${text.file} is missing`);
      assert.match(text.source, /^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[0-9a-f]{40}\//, `${pkg}: the source is not pinned to a commit`);
    }
  }
});
