import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { DEVELOPMENT, discoverVersions, listReleases, syncVersions } from '@/lib/glaux/versions';
import { fixtures, root, tempDir } from './helpers.ts';
import { gitRepository, github, release } from './glaux-fixture.ts';
import { startWorker, type LocalWorker } from '../scripts/worker.ts';

// Builds the real site from a copy of this checkout whose documentation comes from a simulated Glaux
// with two releases and main, then serves it with Wrangler. The credits the build reads are generated
// by `pnpm build`, so this is skipped locally until the site has been built once.
const credits = ['editorial.json', 'glaux.json', 'glaux-texts.json'].map((name) => `public/credits/${name}`);
const ready = credits.every((file) => existsSync(path.join(root, file)));

// Distinct bytes for each version's image, larger than what Vite inlines, so each is a served asset.
// Data after IEND is ignored by every PNG reader.
const image = (name: string) =>
  Buffer.concat([readFileSync(path.join(fixtures, 'assets/dot.png')), Buffer.alloc(8192), Buffer.from(name)]);

function glaux() {
  const { repo, git, commit } = gitRepository();
  const guide = (word: string, extra = '') =>
    `# Glaux guide\n\nThe ${word} revision of the guide.\n\nStart with [getting started](glaux://guide/getting-started#first-steps).\n${extra}`;
  const gettingStarted = (word: string) => `# Getting started\n\nGetting started, ${word} edition.\n\n## First steps\n\n![Logo](../../assets/logo.png)\n`;
  const commits = {
    v010: commit('v0.1.0', {
      'docs/en/guide/index.md': guide('alphaword', '\nSee [the removed page](glaux://guide/removed).\n'),
      'docs/en/guide/getting-started.md': gettingStarted('alphaword'),
      'docs/en/guide/removed.md': '# Removed later\n\nOnly in v0.1.0.\n',
      'docs/assets/logo.png': image('v0.1.0'),
    }),
    v020: '',
    dev: '',
  };
  git('tag', 'v0.1.0');
  git('rm', '--quiet', 'docs/en/guide/removed.md');
  commits.v020 = commit('v0.2.0', {
    'docs/en/guide/index.md': guide('betaword'),
    'docs/en/guide/getting-started.md': gettingStarted('betaword'),
    'docs/en/guide/new.md': '# New in 0.2\n\nAdded in v0.2.0.\n',
    'docs/assets/logo.png': image('v0.2.0'),
  });
  git('tag', 'v0.2.0');
  commits.dev = commit('main', {
    'docs/en/guide/index.md': guide('devword'),
    'docs/en/guide/getting-started.md': gettingStarted('devword'),
    'docs/en/guide/only-on-main.md': '# Only on main\n\nNot released yet.\n',
    'docs/assets/logo.png': image('dev'),
  });
  return { repo, commits };
}

/** A copy of this checkout, with its dependencies linked, to build without touching its output. */
function copyProject(dir: string) {
  const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' })
    .split('\0')
    .filter((file) => file && existsSync(path.join(root, file)));
  for (const file of [...files, ...credits]) {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    copyFileSync(path.join(root, file), path.join(dir, file));
  }
  symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
}

let project: string;
let worker: LocalWorker;
let commits: ReturnType<typeof glaux>['commits'];

beforeAll(async () => {
  if (!ready) return;
  project = path.join(tempDir(), 'site');
  copyProject(project);
  const fixture = glaux();
  ({ commits } = fixture);
  const releases = [release('v0.1.0', '2026-01-01T00:00:00Z'), release('v0.2.0', '2026-02-01T00:00:00Z')];
  const catalog = discoverVersions(fixture.repo, await listReleases('https://github.com/example/glaux.git', undefined, github(releases).fetchImpl));
  const content = path.join(project, 'content/glaux');
  syncVersions(catalog, path.join(tempDir(), 'cache'), content);
  // The versions were fetched from a local repository; the site links to the one on GitHub.
  writeFileSync(path.join(content, 'versions.json'), JSON.stringify({ ...catalog, repository: 'https://github.com/example/glaux.git' }));
  execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { cwd: project, stdio: 'pipe' });
  worker = await startWorker(project);
}, 600_000);

afterAll(async () => {
  await worker?.stop();
  if (project) rmSync(path.dirname(project), { recursive: true, force: true });
});

const html = async (pathname: string) => (await worker.request(pathname)).text();
const location = async (pathname: string) => new URL((await worker.request(pathname, 307)).headers.get('location')!, worker.origin).pathname;
/** The first segment after `/en/docs/` of every manual link. */
const linkedVersions = (page: string) => new Set([...page.matchAll(/href="\/en\/docs\/([^"/#]*)/g)].map((match) => match[1]));

test('URLs without a version, stable and version roots redirect once to the recommended release', { skip: !ready }, async () => {
  expect(await location('/en/docs/guide/getting-started')).toBe('/en/docs/v0.2.0/guide/getting-started');
  expect(await location('/en/docs/stable/guide/new')).toBe('/en/docs/v0.2.0/guide/new');
  expect(await location('/en/docs')).toBe('/en/docs/v0.2.0/guide');
  expect(await location('/en/docs/v0.1.0')).toBe('/en/docs/v0.1.0/guide');
  expect(await location('/en/docs/guide.md')).toBe('/en/docs/v0.2.0/guide.md');
  for (const pathname of ['/en/docs/v0.2.0/guide', '/en/docs/v0.1.0/guide', `/en/docs/${DEVELOPMENT}/guide`]) await worker.request(pathname);
});

test('pages that only some versions have exist only there', { skip: !ready }, async () => {
  await worker.request('/en/docs/v0.1.0/guide/removed');
  await worker.request(`/en/docs/${DEVELOPMENT}/guide/only-on-main`);
  await worker.request('/en/docs/v0.2.0/guide/new');
  for (const pathname of [
    '/en/docs/v0.2.0/guide/removed',
    '/en/docs/guide/removed',
    '/en/docs/stable/guide/only-on-main',
    '/en/docs/v0.1.0/guide/new',
    '/en/docs/v9.9.9/guide',
    '/en/docs/v0.2.0/guide/removed.md',
  ])
    await worker.request(pathname, 404);
});

test('each version has its own navigation, links and images', { skip: !ready }, async () => {
  const pages = {
    'v0.1.0': await html('/en/docs/v0.1.0/guide'),
    'v0.2.0': await html('/en/docs/v0.2.0/guide'),
    [DEVELOPMENT]: await html(`/en/docs/${DEVELOPMENT}/guide`),
  };
  for (const [version, page] of Object.entries(pages)) {
    expect(linkedVersions(page), version).toStrictEqual(new Set([version]));
    // glaux:// links keep the version and the fragment.
    expect(page).toContain(`href="/en/docs/${version}/guide/getting-started#first-steps"`);
  }
  expect(pages['v0.1.0']).toContain('href="/en/docs/v0.1.0/guide/removed"');
  expect(pages['v0.2.0']).not.toContain('/guide/removed"');
  expect(pages[DEVELOPMENT]).toContain(`href="/en/docs/${DEVELOPMENT}/guide/only-on-main"`);
  expect(pages['v0.2.0']).not.toContain('only-on-main');

  const images = new Map<string, string>();
  for (const version of ['v0.1.0', 'v0.2.0', DEVELOPMENT]) {
    const page = await html(`/en/docs/${version}/guide/getting-started`);
    const src = /<img[^>]*alt="Logo"[^>]*src="([^"]+)"|<img[^>]*src="([^"]+)"[^>]*alt="Logo"/.exec(page);
    const url = src?.[1] ?? src?.[2];
    expect(url, version).toBeDefined();
    expect(url).toMatch(/^\/assets\//);
    const bytes = Buffer.from(await (await worker.request(url!)).arrayBuffer());
    expect(bytes.subarray(-version.length).toString(), `${version} serves its own image`).toBe(version);
    images.set(version, url!);
  }
  expect(new Set(images.values()).size).toBe(3);
});

test('search returns only the version it is asked for, and the recommended one by default', { skip: !ready }, async () => {
  const search = async (query: string) => (await (await worker.request(`/api/search?query=${query}&locale=en`)).json()) as { url: string }[];
  const hits = async (word: string, version: string) => search(`${word}&tag=${version}`);
  expect((await hits('alphaword', 'v0.1.0')).length).toBeGreaterThan(0);
  expect(await hits('alphaword', 'v0.2.0')).toStrictEqual([]);
  expect(await hits('devword', 'v0.1.0')).toStrictEqual([]);
  for (const version of ['v0.1.0', 'v0.2.0', DEVELOPMENT]) {
    for (const hit of await hits('guide', version)) expect(hit.url.startsWith(`/en/docs/${version}/`), hit.url).toBe(true);
  }
  expect((await search('betaword')).length).toBeGreaterThan(0);
  expect(await search('alphaword')).toStrictEqual([]);
  await worker.request('/api/search?query=guide&locale=en&tag=v9.9.9', 400);
});

test('the version selector keeps the page and the language, else opens the start of the version', { skip: !ready }, async () => {
  const removed = await html('/en/docs/v0.1.0/guide/removed');
  expect(removed).toMatch(/<select id="gx-version-select"/);
  for (const option of ['v0.2.0 · recommended', 'v0.1.0', 'Development (main)']) expect(removed).toContain(option);
  // The loader data names where each version goes from this page.
  expect(removed).toContain('/en/docs/v0.2.0/guide"');
  expect(removed).toContain('/en/docs/v0.1.0/guide/removed"');
  const started = await html('/en/docs/v0.1.0/guide/getting-started');
  for (const version of ['v0.2.0', DEVELOPMENT]) expect(started).toContain(`/en/docs/${version}/guide/getting-started"`);
});

test('Markdown, metadata, sitemap and source links follow the version', { skip: !ready }, async () => {
  expect(await (await worker.request('/en/docs/v0.1.0/guide.md')).text()).toMatch(/alphaword/);
  expect(await (await worker.request(`/en/docs/${DEVELOPMENT}/guide.md`)).text()).toMatch(/devword/);

  const old = await html('/en/docs/v0.1.0/guide');
  expect(old).toContain('rel="canonical" href="https://glauxconsole.dev/en/docs/v0.1.0/guide"');
  expect(old).toContain('content="https://glauxconsole.dev/og/en/docs/v0.1.0/guide.png"');
  await worker.request('/og/en/docs/v0.1.0/guide.png');
  expect(old).toContain(`https://github.com/example/glaux/blob/${commits.v010}/docs/en/guide/index.md`);
  expect(old).toContain('View source at v0.1.0');
  expect(old).not.toContain('features that are not released yet');

  const development = await html(`/en/docs/${DEVELOPMENT}/guide`);
  expect(development).toContain('https://github.com/example/glaux/blob/main/docs/en/guide/index.md');
  expect(development).toContain('Edit on GitHub');
  expect(development).toContain('features that are not released yet');

  const sitemap = await (await worker.request('/sitemap.xml')).text();
  expect(sitemap).toContain('<loc>https://glauxconsole.dev/en/docs/v0.2.0/guide</loc>');
  expect(sitemap).toContain('<loc>https://glauxconsole.dev/en/docs/v0.2.0/guide/new</loc>');
  expect(sitemap).not.toMatch(/docs\/(v0\.1\.0|dev|stable)\/|docs\/guide/);

  const llms = await (await worker.request('/llms.txt')).text();
  expect(llms).toContain('/en/docs/v0.2.0/guide');
  expect(llms).not.toMatch(/\/en\/docs\/(v0\.1\.0|dev)\//);
});
