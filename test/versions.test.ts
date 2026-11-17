import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { DEVELOPMENT, discoverVersions, listReleases, readCatalog, syncVersions } from '@/lib/glaux/versions';
import { digest, tempDir } from './helpers.ts';
import { gitRepository, github, release } from './glaux-fixture.ts';

/** A Glaux repository with three documentation revisions: two tagged releases and `main`. */
function glauxRepository() {
  const { repo, git, commit } = gitRepository();
  const revision = (name: string) => ({
    'docs/en/guide/index.md': `# Guide\n\n${name} revision.\n\n![Logo](../../assets/logo.png)\n`,
    'docs/assets/logo.png': `${name} image`,
    'docs/api/graphics.ron': `(revision: "${name}")`,
  });
  const first = commit('first', { ...revision('First'), 'docs/ids.lock': 'guide/index\n', 'rom/big-file.bin': 'not documentation' });
  git('tag', '-a', 'v0.1.0', '-m', 'v0.1.0');
  const second = commit('second', revision('Second'));
  git('tag', 'v0.2.0-beta.1');
  const third = commit('third', { ...revision('Development'), 'docs/en/guide/extra.md': '# Extra\n\nOnly on main.\n' });
  return { repo, git, commit, first, second, third };
}

// The tags come from the local repository and the releases from the simulated API.
const discover = async (repo: string, fetchImpl: typeof fetch) =>
  discoverVersions(repo, await listReleases('https://github.com/example/glaux.git', undefined, fetchImpl));

const published = [
  // A full first page of drafts, which only people with push access ever see, forces a second page.
  ...Array.from({ length: 100 }, (_, i) => release(`draft-${i}`, null, { draft: true })),
  release('v0.1.0', '2026-01-01T00:00:00Z'),
  release('v0.2.0-beta.1', '2026-02-01T00:00:00Z', { prerelease: true }),
];

test('published releases, prereleases and main are resolved to exact commits; drafts are left out', async () => {
  const { repo, first, second, third } = glauxRepository();
  const { fetchImpl, urls } = github(published);
  const catalog = await discover(repo, fetchImpl);
  expect(urls.map((url) => new URL(url).searchParams.get('page'))).toStrictEqual(['1', '2']);
  expect(urls[0]).toMatch(/^https:\/\/api\.github\.com\/repos\/example\/glaux\/releases\?/);
  expect(catalog).toStrictEqual({
    repository: repo,
    default: 'v0.1.0',
    versions: [
      { id: 'v0.2.0-beta.1', kind: 'prerelease', tag: 'v0.2.0-beta.1', commit: second, publishedAt: '2026-02-01T00:00:00Z' },
      // An annotated tag resolves to its commit, not to the tag object.
      { id: 'v0.1.0', kind: 'release', tag: 'v0.1.0', commit: first, publishedAt: '2026-01-01T00:00:00Z' },
      { id: DEVELOPMENT, kind: 'development', commit: third },
    ],
  });
});

test('the default version is the latest release, else the latest prerelease, else development', async () => {
  const { repo } = glauxRepository();
  expect((await discover(repo, github([]).fetchImpl)).versions.map((v) => v.id)).toStrictEqual([DEVELOPMENT]);
  expect((await discover(repo, github([]).fetchImpl)).default).toBe(DEVELOPMENT);
  const prerelease = release('v0.2.0-beta.1', '2026-02-01T00:00:00Z', { prerelease: true });
  expect((await discover(repo, github([prerelease]).fetchImpl)).default).toBe('v0.2.0-beta.1');
});

test('discovery fails clearly when GitHub fails or a release has no tag', async () => {
  const { repo } = glauxRepository();
  await expect(discover(repo, github([], 503).fetchImpl)).rejects.toThrow(/GitHub answered 503/);
  await expect(discover(repo, github([release('v9.9.9', '2026-03-01T00:00:00Z')]).fetchImpl)).rejects.toThrow(/release v9\.9\.9 has no tag/);
  await expect(discover(repo, github([release('../x', '2026-03-01T00:00:00Z')]).fetchImpl)).rejects.toThrow(/cannot name a documentation version/);
});

test('every version is synced from its own commit, with its own pages, images and API catalog', async () => {
  const { repo, first, third } = glauxRepository();
  const catalog = await discover(repo, github(published).fetchImpl);
  const [cache, out] = [tempDir(), path.join(tempDir(), 'glaux')];
  const manifests = syncVersions(catalog, cache, out);

  expect(readCatalog(out)).toStrictEqual(catalog);
  expect(readdirSync(out).sort()).toStrictEqual(['.glaux-generated', DEVELOPMENT, 'v0.1.0', 'v0.2.0-beta.1', 'versions.json']);
  const read = (file: string) => readFileSync(path.join(out, file), 'utf8');
  for (const [id, name] of [['v0.1.0', 'First'], ['v0.2.0-beta.1', 'Second'], [DEVELOPMENT, 'Development']]) {
    expect(read(`${id}/en/guide/index.md`)).toMatch(new RegExp(`${name} revision`));
    expect(read(`${id}/assets/logo.png`)).toBe(`${name} image`);
    expect(read(`${id}/api/graphics.ron`)).toBe(`(revision: "${name}")`);
  }
  expect(existsSync(path.join(out, DEVELOPMENT, 'en/guide/extra.md'))).toBe(true);
  expect(existsSync(path.join(out, 'v0.1.0/en/guide/extra.md')), 'a page added later is not in an older version').toBe(false);
  expect(Object.keys(manifests['v0.1.0'].languages.en)).toStrictEqual(['guide/index']);
  expect(JSON.parse(read('v0.1.0/manifest.json')).source).toStrictEqual({ version: 'v0.1.0', commit: first });
  expect(JSON.parse(read(`${DEVELOPMENT}/manifest.json`)).source).toStrictEqual({ version: DEVELOPMENT, commit: third });
  expect(existsSync(path.join(cache, first, 'rom')), 'only docs/ is checked out').toBe(false);
});

test('a moved main is fetched again; releases come from the cache and the old main is dropped', async () => {
  const { repo, commit, first, third } = glauxRepository();
  const [cache, out] = [tempDir(), path.join(tempDir(), 'glaux')];
  syncVersions(await discover(repo, github(published).fetchImpl), cache, out);
  // A file outside docs/ survives only if the checkout is reused.
  writeFileSync(path.join(cache, first, 'reused'), '');

  const fourth = commit('fourth', { 'docs/en/guide/index.md': '# Guide\n\nNewer revision.\n' });
  syncVersions(await discover(repo, github(published).fetchImpl), cache, out);
  expect(existsSync(path.join(cache, first, 'reused'))).toBe(true);
  expect(existsSync(path.join(cache, third))).toBe(false);
  expect(existsSync(path.join(cache, fourth))).toBe(true);
  expect(readFileSync(path.join(out, DEVELOPMENT, 'en/guide/index.md'), 'utf8')).toMatch(/Newer revision/);
});

test('a version that cannot be synced leaves the previous output and cache as they were', async () => {
  const { repo } = glauxRepository();
  const [cache, out] = [tempDir(), path.join(tempDir(), 'glaux')];
  const catalog = await discover(repo, github(published).fetchImpl);
  syncVersions(catalog, cache, out);
  const before = { out: digest(out), cache: readdirSync(cache).sort() };

  const broken = { ...catalog, versions: [...catalog.versions, { id: 'v0.0.1', kind: 'release' as const, commit: 'b'.repeat(40) }] };
  expect(() => syncVersions(broken, cache, out)).toThrow(/cannot fetch Glaux commit b{40}/);
  expect(digest(out)).toBe(before.out);
  expect(readdirSync(cache).sort()).toStrictEqual(before.cache);
  expect(existsSync(`${out}.next`)).toBe(false);
});
