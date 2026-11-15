import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { COMMIT, fetchDocs, git } from './checkout.ts';
import type { Manifest } from './manifest.ts';
import { MARKER, syncDocs } from './sync.ts';

export const GLAUX_REPOSITORY = 'https://github.com/Vulpix-Strix/glaux.git';
/** Id of the documentation of the development branch. */
export const DEVELOPMENT = 'development';
const DEVELOPMENT_BRANCH = 'main';
/** The catalog, written next to the versions it lists. */
export const CATALOG_FILE = 'versions.json';

export type VersionKind = 'release' | 'prerelease' | 'development';

export interface Version {
  /** Directory of the version below the content directory: the release tag, or {@link DEVELOPMENT}. */
  id: string;
  kind: VersionKind;
  tag?: string;
  commit: string;
  publishedAt?: string;
}

export interface Catalog {
  repository: string;
  /** Id of the version the site shows: the latest release, else the latest prerelease, else development. */
  default: string;
  /** Releases newest first, then development. */
  versions: Version[];
}

/** The fields of a GitHub release this module reads. */
export interface Release {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
}

// A tag becomes a directory name and a URL segment.
const SAFE_TAG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const PAGE_SIZE = 100;

function githubSlug(repository: string): string {
  const match = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(repository);
  if (!match) throw new Error(`${repository} is not a GitHub repository URL`);
  return `${match[1]}/${match[2]}`;
}

/**
 * Every release of `repository`, from the GitHub API. `token` only raises the rate limit, which
 * shared CI runners exhaust quickly without one; the releases are public either way.
 */
export async function listReleases(repository: string, token?: string, fetchImpl: typeof fetch = fetch): Promise<Release[]> {
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'glaux-website-docs-sync',
    'x-github-api-version': '2022-11-28',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
  const releases: Release[] = [];
  for (let page = 1; ; page++) {
    const url = `https://api.github.com/repos/${githubSlug(repository)}/releases?per_page=${PAGE_SIZE}&page=${page}`;
    const response = await fetchImpl(url, { headers });
    if (!response.ok) throw new Error(`cannot list the releases of ${repository}: GitHub answered ${response.status} for ${url}`);
    const batch: unknown = await response.json();
    if (!Array.isArray(batch)) throw new Error(`cannot list the releases of ${repository}: ${url} did not return a list`);
    releases.push(...(batch as Release[]));
    if (batch.length < PAGE_SIZE) return releases;
  }
}

/** The tags and branches of `repository`, by name, resolved to commits. Annotated tags resolve to the commit they point at. */
function remoteRefs(repository: string) {
  const tags = new Map<string, string>();
  const branches = new Map<string, string>();
  for (const line of git(process.cwd(), 'ls-remote', '--tags', '--heads', repository).split('\n').filter(Boolean)) {
    const [commit, ref] = line.split('\t');
    if (ref.startsWith('refs/heads/')) branches.set(ref.slice('refs/heads/'.length), commit);
    else if (ref.endsWith('^{}')) tags.set(ref.slice('refs/tags/'.length, -3), commit);
    else if (!tags.has(ref.slice('refs/tags/'.length))) tags.set(ref.slice('refs/tags/'.length), commit);
  }
  return { tags, branches };
}

/**
 * Lists the documented versions of `repository` from its GitHub `releases`: the published
 * releases and prereleases, and the development branch. Every one is resolved to an exact
 * commit, so the rest of the build reads fixed revisions even if a ref moves meanwhile.
 */
export function discoverVersions(repository: string, releases: Release[]): Catalog {
  const published = releases
    .filter((release) => !release.draft)
    .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''));
  const { tags, branches } = remoteRefs(repository);

  const versions: Version[] = published.map((release) => {
    const tag = release.tag_name;
    if (!SAFE_TAG.test(tag) || tag === DEVELOPMENT) throw new Error(`release tag ${JSON.stringify(tag)} cannot name a documentation version`);
    const commit = tags.get(tag);
    if (!commit) throw new Error(`release ${tag} has no tag ${tag} in ${repository}`);
    return {
      id: tag,
      kind: release.prerelease ? 'prerelease' : 'release',
      tag,
      commit,
      ...(release.published_at ? { publishedAt: release.published_at } : {}),
    };
  });
  const development = branches.get(DEVELOPMENT_BRANCH);
  if (!development) throw new Error(`${repository} has no ${DEVELOPMENT_BRANCH} branch`);
  versions.push({ id: DEVELOPMENT, kind: 'development', commit: development });

  const preferred = versions.find((v) => v.kind === 'release') ?? versions.find((v) => v.kind === 'prerelease') ?? versions.at(-1)!;
  return { repository, default: preferred.id, versions };
}

/**
 * Writes the documentation of every version of `catalog` to `outDir/<id>/`, and the catalog
 * itself to `outDir/versions.json`. Each version is checked out at its commit below
 * `cacheDir`, where a commit that is already there is reused.
 *
 * The result is built next to `outDir` and moved into place at the end, so a failing version
 * leaves the previous output and the cache as they were.
 */
export function syncVersions(catalog: Catalog, cacheDir: string, outDir: string): Record<string, Manifest> {
  if (statSync(outDir, { throwIfNoEntry: false }) && !statSync(path.join(outDir, MARKER), { throwIfNoEntry: false }) && readdirSync(outDir).length > 0) {
    throw new Error(`${outDir} exists and was not generated by this script; refusing to empty it`);
  }
  const staging = `${outDir}.next`;
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  const manifests: Record<string, Manifest> = {};
  try {
    for (const version of catalog.versions) {
      const docsDir = fetchDocs({ repository: catalog.repository, commit: version.commit }, path.join(cacheDir, version.commit));
      manifests[version.id] = syncDocs(docsDir, path.join(staging, version.id), { source: { version: version.id, commit: version.commit } });
    }
    writeFileSync(path.join(staging, MARKER), 'Generated by scripts/sync-glaux-docs.ts. Do not edit.\n');
    writeFileSync(path.join(staging, CATALOG_FILE), JSON.stringify(catalog, null, 2) + '\n');
    rmSync(outDir, { recursive: true, force: true });
    renameSync(staging, outDir);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }

  const commits = new Set(catalog.versions.map((v) => v.commit));
  for (const entry of readdirSync(cacheDir)) {
    if (!(COMMIT.test(entry) && commits.has(entry))) rmSync(path.join(cacheDir, entry), { recursive: true, force: true });
  }
  return manifests;
}

export function readCatalog(contentDir: string): Catalog {
  const file = path.join(contentDir, CATALOG_FILE);
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Catalog;
  } catch (error) {
    throw new Error(`cannot read the Glaux documentation catalog at ${file}; run \`pnpm docs:sync\` first (${String(error)})`);
  }
}

export function defaultVersion(catalog: Catalog): Version {
  return catalog.versions.find((v) => v.id === catalog.default)!;
}

/** The directory of the version the site shows, below `contentDir`. */
export const defaultVersionDir = (contentDir: string) => path.join(contentDir, readCatalog(contentDir).default);
