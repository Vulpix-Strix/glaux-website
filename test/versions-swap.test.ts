import { readdirSync } from 'node:fs';
import * as fs from 'node:fs';
import path from 'node:path';
import { expect, test, vi } from 'vitest';
import { DEVELOPMENT, syncVersions } from '@/lib/glaux/versions';
import { digest, tempDir } from './helpers.ts';
import { gitRepository } from './glaux-fixture.ts';

// Fails the rename that moves the new output into place, once.
const failing = vi.hoisted(() => ({ staging: undefined as string | undefined }));
vi.mock('node:fs', async (original) => {
  const actual = await original<typeof import('node:fs')>();
  return {
    ...actual,
    renameSync: (from: fs.PathLike, to: fs.PathLike) => {
      if (String(from) === failing.staging) {
        failing.staging = undefined;
        throw new Error('simulated rename failure');
      }
      actual.renameSync(from, to);
    },
  };
});

function repository() {
  const { repo, commit } = gitRepository();
  return { repo, commit: (text: string) => commit(text, { 'docs/en/guide/index.md': `# Guide\n\n${text}\n` }) };
}

test('a swap that fails restores the previous output and keeps the cache', () => {
  const { repo, commit } = repository();
  const [cache, out] = [tempDir(), path.join(tempDir(), 'glaux')];
  const first = commit('First');
  syncVersions({ repository: repo, default: DEVELOPMENT, versions: [{ id: DEVELOPMENT, kind: 'development', commit: first }] }, cache, out);
  const before = digest(out);

  const second = commit('Second');
  failing.staging = `${out}.next`;
  expect(() =>
    syncVersions({ repository: repo, default: DEVELOPMENT, versions: [{ id: DEVELOPMENT, kind: 'development', commit: second }] }, cache, out),
  ).toThrow(/simulated rename failure/);
  expect(digest(out)).toBe(before);
  // The old commit stays cached: the cache is only pruned after a successful sync.
  expect(readdirSync(cache).sort()).toStrictEqual([first, second].sort());
  expect(readdirSync(path.dirname(out))).toStrictEqual(['glaux']);
});

test('an output left aside by an interrupted swap is restored before syncing', () => {
  const { repo, commit } = repository();
  const [cache, out] = [tempDir(), path.join(tempDir(), 'glaux')];
  const catalog = { repository: repo, default: DEVELOPMENT, versions: [{ id: DEVELOPMENT, kind: 'development' as const, commit: commit('First') }] };
  syncVersions(catalog, cache, out);
  fs.renameSync(out, `${out}.previous`);
  // A version that cannot be fetched fails the sync after the recovery.
  expect(() => syncVersions({ ...catalog, versions: [{ ...catalog.versions[0], commit: 'c'.repeat(40) }] }, cache, out)).toThrow(/cannot fetch/);
  expect(readdirSync(path.dirname(out))).toStrictEqual(['glaux']);
  expect(fs.readFileSync(path.join(out, DEVELOPMENT, 'en/guide/index.md'), 'utf8')).toMatch(/First/);
});
