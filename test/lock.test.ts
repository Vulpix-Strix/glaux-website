import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { fetchLockedDocs, resolveRemoteRef } from '../src/lib/glaux/checkout.ts';
import { CACHE_DIR, LOCK_FILE, resolveDocsSource } from '../src/lib/glaux/docs-source.ts';
import { formatLock, parseLock, readLock } from '../src/lib/glaux/lock.ts';
import { syncDocs } from '../src/lib/glaux/sync.ts';
import { digest, fixtures, root, tempDir, writeTree } from './helpers.ts';

const HASH = 'a'.repeat(40);

test('the lock file of this repository is valid and pins a full commit', () => {
  const lock = readLock(path.join(root, LOCK_FILE));
  expect(lock.commit).toMatch(/^[0-9a-f]{40}$/);
  expect(lock.repository).toBe('https://github.com/Vulpix-Strix/glaux.git');
});

test('lock files are read and written without losing anything', () => {
  const lock = { repository: 'https://example.com/glaux.git', commit: HASH };
  expect(parseLock(formatLock(lock))).toStrictEqual(lock);
  expect(parseLock(`# note\n\ncommit=${HASH}\nrepository = x\n`)).toStrictEqual({ repository: 'x', commit: HASH });
});

test('a malformed lock file says what is wrong', () => {
  expect(() => parseLock(`repository = x\n`)).toThrow(/`commit` is missing/);
  expect(() => parseLock(`commit = ${HASH}\n`)).toThrow(/`repository` is missing/);
  expect(() => parseLock(`repository = x\ncommit = main\n`)).toThrow(/full 40 character hash, not "main"/);
  expect(() => parseLock(`repository = x\ncommit = ${HASH.slice(0, 7)}\n`)).toThrow(/full 40 character hash/);
  expect(() => parseLock(`repository = x\ncommit = ${HASH}\ncommit = ${HASH}\n`)).toThrow(/set twice/);
  expect(() => parseLock(`repository = x\ncommit = ${HASH}\nbranch = main\n`)).toThrow(/unknown key `branch`/);
  expect(() => parseLock(`nonsense\n`)).toThrow(/glaux-docs\.lock:1: expected `key = value`/);
  expect(() => readLock(path.join(tempDir(), 'missing.lock'))).toThrow(/cannot read/);
});

/** A Git repository standing in for Glaux, with two commits. */
function glauxRepository() {
  const repo = tempDir();
  const git = (...args: string[]) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args], {
      cwd: repo,
      encoding: 'utf8',
    }).trim();
  git('init', '--quiet', '--initial-branch=main');
  git('config', 'uploadpack.allowAnySHA1InWant', 'true'); // what GitHub allows
  writeTree(repo, {
    'docs/en/guide/index.md': '# Guide\n\nFirst revision.\n',
    'docs/ids.lock': 'guide/index\n',
    'rom/big-file.bin': 'not documentation',
  });
  git('add', '.');
  git('commit', '--quiet', '-m', 'first');
  const first = git('rev-parse', 'HEAD');
  writeTree(repo, { 'docs/en/guide/index.md': '# Guide\n\nSecond revision.\n', 'docs/en/guide/extra.md': '# Extra\n\nNew.\n' });
  git('add', '.');
  git('commit', '--quiet', '-m', 'second');
  return { repo, first, second: git('rev-parse', 'HEAD') };
}

/** A website checkout with a lock file, and its cache. */
function website(repo: string, commit: string) {
  const dir = tempDir();
  writeTree(dir, { [LOCK_FILE]: formatLock({ repository: repo, commit }) });
  return dir;
}

test('the pinned revision is fetched, not whatever the branch holds now', () => {
  const { repo, first } = glauxRepository();
  const site = website(repo, first);
  const { docsDir, manifest } = resolveDocsSource({ root: site, locked: true });
  expect(docsDir).toBe(path.join(site, CACHE_DIR, 'docs'));
  expect(manifest).toStrictEqual({ kind: 'locked', commit: first });
  expect(readFileSync(path.join(docsDir, 'en/guide/index.md'), 'utf8')).toMatch(/First revision/);
  expect(!existsSync(path.join(docsDir, 'en/guide/extra.md')), 'the later commit is not there').toBeTruthy();
  expect(!existsSync(path.join(docsDir, '../rom')), 'only docs/ is checked out').toBeTruthy();
});

test('a locked sync is reproducible: the same files from a fresh fetch', () => {
  const { repo, first } = glauxRepository();
  const site = website(repo, first);
  const [a, b] = [tempDir(), tempDir()];
  const one = resolveDocsSource({ root: site, locked: true });
  syncDocs(one.docsDir, a, { source: one.manifest });
  rmSync(path.join(site, CACHE_DIR), { recursive: true });
  const two = resolveDocsSource({ root: site, locked: true });
  syncDocs(two.docsDir, b, { source: two.manifest });
  expect(digest(a)).toBe(digest(b));
  expect(JSON.parse(readFileSync(path.join(a, 'manifest.json'), 'utf8')).source.commit).toBe(first);
});

test('the Rust documentation validator can fetch the full pinned source', () => {
  const { repo, first } = glauxRepository();
  const cache = path.join(tempDir(), 'validator');
  const docs = fetchLockedDocs({ repository: repo, commit: first }, cache, false);
  expect(readFileSync(path.join(docs, 'en/guide/index.md'), 'utf8')).toMatch(/First revision/);
  expect(readFileSync(path.join(cache, 'rom/big-file.bin'), 'utf8')).toBe('not documentation');
});

test('moving the lock moves the result', () => {
  const { repo, first, second } = glauxRepository();
  const site = website(repo, first);
  resolveDocsSource({ root: site, locked: true });
  writeFileSync(path.join(site, LOCK_FILE), formatLock({ repository: repo, commit: second }));
  const { docsDir } = resolveDocsSource({ root: site, locked: true });
  expect(readFileSync(path.join(docsDir, 'en/guide/index.md'), 'utf8')).toMatch(/Second revision/);
  expect(existsSync(path.join(docsDir, 'en/guide/extra.md'))).toBeTruthy();
});

test('a revision that cannot be fetched fails clearly and leaves no half checkout', () => {
  const { repo } = glauxRepository();
  const site = website(repo, 'b'.repeat(40));
  expect(() => resolveDocsSource({ root: site, locked: true })).toThrow(/cannot fetch Glaux commit b{40}/);
  expect(!existsSync(path.join(site, CACHE_DIR))).toBeTruthy();
  const gone = website(path.join(tempDir(), 'no-such-repository'), HASH);
  expect(() => resolveDocsSource({ root: gone, locked: true })).toThrow(/cannot fetch/);
});

test('a missing lock file or a commit without docs fail clearly', () => {
  expect(() => resolveDocsSource({ root: tempDir(), locked: true })).toThrow(/cannot read .*glaux-docs\.lock/);

  const repo = tempDir();
  const git = (...args: string[]) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], { cwd: repo, encoding: 'utf8' }).trim();
  git('init', '--quiet', '--initial-branch=main');
  writeTree(repo, { 'README.md': 'no docs here' });
  git('add', '.');
  git('commit', '--quiet', '-m', 'x');
  expect(() => fetchLockedDocs({ repository: repo, commit: git('rev-parse', 'HEAD') }, path.join(tempDir(), 'c'))).toThrow(/no docs\/ directory/);
});

test('--locked is chosen by flag or environment, and cannot be mixed with --source', () => {
  const { repo, first } = glauxRepository();
  const site = website(repo, first);
  expect(resolveDocsSource({ root: site, env: { GLAUX_DOCS_LOCKED: '1' } }).manifest.kind).toBe('locked');
  expect(resolveDocsSource({ root: site, locked: true, env: { GLAUX_DOCS_DIR: '/nowhere' } }).manifest.kind).toBe('locked');
  expect(() => resolveDocsSource({ root: site, locked: true, source: '/x' })).toThrow(/cannot be combined/);
});

test('local development keeps working: --source, GLAUX_DOCS_DIR and the sibling checkout', () => {
  const site = tempDir();
  const docs = path.join(site, 'mine');
  expect(resolveDocsSource({ root: site, source: docs }).docsDir).toBe(docs);
  expect(resolveDocsSource({ root: site, env: { GLAUX_DOCS_DIR: docs } }).docsDir).toBe(docs);
  expect(resolveDocsSource({ root: site, env: {} }).docsDir).toBe(path.resolve(site, '../glaux/docs'));
  // Not the `docs/` of a repository, so there is no commit to record (these fixtures sit inside this one).
  expect(resolveDocsSource({ root: site, source: fixtures }).manifest).toStrictEqual({ kind: 'local', commit: undefined });
});

test('a local checkout that is not at the pinned commit is mentioned, not refused', () => {
  const { repo, first, second } = glauxRepository();
  const site = website(repo, first);
  const behind = resolveDocsSource({ root: site, source: path.join(repo, 'docs') });
  expect(behind.manifest).toStrictEqual({ kind: 'local', commit: second });
  expect(behind.notices.join()).toMatch(/pins [0-9a-f]{10}/);
  writeFileSync(path.join(site, LOCK_FILE), formatLock({ repository: repo, commit: second }));
  expect(resolveDocsSource({ root: site, source: path.join(repo, 'docs') }).notices).toStrictEqual([]);
});

test('refs of the remote repository resolve to full commits', () => {
  const { repo, second } = glauxRepository();
  expect(resolveRemoteRef(repo, 'HEAD')).toBe(second);
  expect(resolveRemoteRef(repo, 'main')).toBe(second);
  expect(() => resolveRemoteRef(repo, 'nope')).toThrow(/no branch or tag named nope/);
});


test('downloads ignore inherited Git configuration without changing local development', () => {
  const { repo, first } = glauxRepository();
  const config = path.join(tempDir(), 'gitconfig');
  writeFileSync(config, `[url "${path.join(tempDir(), 'unavailable')}"]\n  insteadOf = ${repo}\n`);
  const saved = { ...process.env };
  try {
    process.env.GIT_CONFIG_GLOBAL = config;
    process.env.GIT_CONFIG_COUNT = '1';
    process.env.GIT_CONFIG_KEY_0 = `url.${path.join(tempDir(), 'also-unavailable')}.insteadOf`;
    process.env.GIT_CONFIG_VALUE_0 = repo;
    const dir = fetchLockedDocs({ repository: repo, commit: first }, path.join(tempDir(), 'checkout'));
    expect(readFileSync(path.join(dir, 'en/guide/index.md'), 'utf8')).toMatch(/First revision/);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});
