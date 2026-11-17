import { expect, test } from 'vitest';
import type { Catalog, Version } from '@/lib/glaux/catalog';
import { resolveDocsPath, versionOptions, type DocsPages } from '@/lib/docs/versions';
import { searchVersion } from '@/lib/docs/catalog';

const version = (id: string, kind: Version['kind']): Version => ({ id, kind, commit: id.padEnd(40, '0') });
const catalogOf = (...versions: Version[]): Catalog => ({
  repository: 'https://github.com/example/glaux.git',
  default: (versions.find((v) => v.kind === 'release') ?? versions.find((v) => v.kind === 'prerelease') ?? versions.at(-1)!).id,
  versions,
});

/** Pages per version, by their slugs joined with `/`. */
function pagesOf(pages: Record<string, string[]>): DocsPages {
  return {
    has: (v, slugs) => pages[v]?.includes(slugs.join('/')) ?? false,
    home: (v) => pages[v]?.[0]?.split('/'),
  };
}

const pages = pagesOf({
  'v0.2.0': ['guide', 'guide/getting-started', 'guide/new-in-0-2'],
  'v0.1.0': ['guide', 'guide/getting-started', 'guide/removed-later'],
  'v0.3.0-beta.1': ['guide', 'guide/getting-started'],
  dev: ['guide', 'guide/getting-started', 'guide/only-on-main'],
});
const full = catalogOf(version('v0.3.0-beta.1', 'prerelease'), version('v0.2.0', 'release'), version('v0.1.0', 'release'), version('dev', 'development'));
const resolve = (catalog: Catalog, path: string) => resolveDocsPath(catalog, path.split('/').filter(Boolean), pages);

test('a known version serves its own pages and nothing from another version', () => {
  expect(resolve(full, 'v0.1.0/guide/getting-started')).toStrictEqual({ kind: 'page', version: 'v0.1.0', slugs: ['guide', 'getting-started'] });
  expect(resolve(full, 'dev/guide/only-on-main')).toStrictEqual({ kind: 'page', version: 'dev', slugs: ['guide', 'only-on-main'] });
  expect(resolve(full, 'v0.1.0/guide/only-on-main')).toStrictEqual({ kind: 'not-found' });
  expect(resolve(full, 'v0.2.0/guide/removed-later')).toStrictEqual({ kind: 'not-found' });
});

test('unknown versions and unknown pages are not found instead of redirecting', () => {
  expect(resolve(full, 'v9.9.9/guide')).toStrictEqual({ kind: 'not-found' });
  expect(resolve(full, 'missing')).toStrictEqual({ kind: 'not-found' });
  // An old URL to a page the recommended version no longer has.
  expect(resolve(full, 'guide/removed-later')).toStrictEqual({ kind: 'not-found' });
  expect(resolve(full, 'stable/guide/only-on-main')).toStrictEqual({ kind: 'not-found' });
});

test('URLs without a version, stable and roots redirect to a page that exists', () => {
  expect(resolve(full, 'guide/getting-started')).toStrictEqual({ kind: 'redirect', segments: ['v0.2.0', 'guide', 'getting-started'] });
  expect(resolve(full, 'stable/guide/new-in-0-2')).toStrictEqual({ kind: 'redirect', segments: ['v0.2.0', 'guide', 'new-in-0-2'] });
  expect(resolve(full, '')).toStrictEqual({ kind: 'redirect', segments: ['v0.2.0', 'guide'] });
  expect(resolve(full, 'stable')).toStrictEqual({ kind: 'redirect', segments: ['v0.2.0', 'guide'] });
  expect(resolve(full, 'dev')).toStrictEqual({ kind: 'redirect', segments: ['dev', 'guide'] });
});

test('every redirect lands on a page, so none is followed by another', () => {
  for (const path of ['', 'guide', 'guide/getting-started', 'stable', 'stable/guide', 'dev', 'v0.1.0', 'v0.3.0-beta.1']) {
    const first = resolve(full, path);
    if (first.kind !== 'redirect') throw new Error(`${path} did not redirect`);
    expect(resolve(full, first.segments.join('/')).kind, path).toBe('page');
  }
});

test('without releases the manual starts at the latest prerelease, else at development', () => {
  const prereleases = catalogOf(version('v0.3.0-beta.1', 'prerelease'), version('dev', 'development'));
  expect(resolve(prereleases, 'guide/getting-started')).toStrictEqual({ kind: 'redirect', segments: ['v0.3.0-beta.1', 'guide', 'getting-started'] });
  expect(resolve(prereleases, 'stable/guide')).toStrictEqual({ kind: 'redirect', segments: ['v0.3.0-beta.1', 'guide'] });

  const development = catalogOf(version('dev', 'development'));
  expect(resolve(development, 'guide/getting-started')).toStrictEqual({ kind: 'redirect', segments: ['dev', 'guide', 'getting-started'] });
  expect(resolve(development, 'stable')).toStrictEqual({ kind: 'redirect', segments: ['dev', 'guide'] });
  expect(resolve(development, '')).toStrictEqual({ kind: 'redirect', segments: ['dev', 'guide'] });
});

test('search covers the version of a manual page and the recommended version elsewhere', () => {
  // The catalog of the last sync, whatever it lists.
  const ids = searchVersion('/en/news');
  expect(searchVersion('/en')).toBe(ids);
  expect(searchVersion('/en/docs/not-a-version/guide')).toBe(ids);
  expect(searchVersion(`/en/docs/${ids}/guide`)).toBe(ids);
});

test('switching versions keeps the page by its Glaux id, else opens the start of the version', () => {
  const ids: Record<string, string[]> = {
    'v0.1.0': ['guide/index', 'guide/removed-later'],
    'v0.2.0': ['guide/index', 'guide/new-in-0-2'],
    dev: ['guide/index', 'guide/new-in-0-2'],
  };
  const catalog = catalogOf(version('v0.2.0', 'release'), version('v0.1.0', 'release'), version('dev', 'development'));
  const options = versionOptions(
    catalog,
    'guide/new-in-0-2',
    (v, id) => (ids[v].includes(id) ? `/es/docs/${v}/${id}` : undefined),
    (v) => `/es/docs/${v}/guide`,
  );
  expect(options).toStrictEqual([
    { id: 'v0.2.0', kind: 'release', recommended: true, href: '/es/docs/v0.2.0/guide/new-in-0-2', hasPage: true },
    { id: 'v0.1.0', kind: 'release', recommended: false, href: '/es/docs/v0.1.0/guide', hasPage: false },
    { id: 'dev', kind: 'development', recommended: false, href: '/es/docs/dev/guide/new-in-0-2', hasPage: true },
  ]);
});
