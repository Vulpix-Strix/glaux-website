import { STABLE, latestRelease, type Catalog, type Version, type VersionKind } from '../glaux/catalog.ts';

/**
 * The files of one version of the synced documentation, with paths relative to the version,
 * so the `dir` i18n parser reads their first segment as the language.
 */
export function versionSource<S extends { files: { path: string }[] }>(source: S, version: string): S {
  const prefix = `${version}/`;
  const files = source.files.filter((file) => file.path.startsWith(prefix)).map((file) => ({ ...file, path: file.path.slice(prefix.length) }));
  return { ...source, files };
}

export type DocsTarget =
  | { kind: 'page'; version: string; slugs: string[] }
  /** The segments after `/docs` to redirect to. */
  | { kind: 'redirect'; segments: string[] }
  | { kind: 'not-found' };

export interface DocsPages {
  has(version: string, slugs: string[]): boolean;
  /** Slugs of the first page of a version, or `undefined` when it has none. */
  home(version: string): string[] | undefined;
}

/**
 * Resolves the segments after `/<lang>/docs`. A known version serves its pages, `stable` and
 * URLs without a version redirect to a page that exists, and everything else is not found.
 * Every redirect names a version and a page it has, so following one never redirects again.
 */
export function resolveDocsPath(catalog: Catalog, segments: string[], pages: DocsPages): DocsTarget {
  const [first, ...rest] = segments;
  const toPage = (version: string, slugs: string[]): DocsTarget => {
    if (pages.has(version, slugs)) return { kind: 'redirect', segments: [version, ...slugs] };
    const home = slugs.length === 0 ? pages.home(version) : undefined;
    return home ? { kind: 'redirect', segments: [version, ...home] } : { kind: 'not-found' };
  };

  if (first !== undefined && catalog.versions.some((v) => v.id === first)) {
    if (pages.has(first, rest)) return { kind: 'page', version: first, slugs: rest };
    return rest.length === 0 ? toPage(first, rest) : { kind: 'not-found' };
  }
  if (first === STABLE) return toPage((latestRelease(catalog) ?? recommended(catalog)).id, rest);
  return toPage(catalog.default, segments);
}

export const recommended = (catalog: Catalog): Version => catalog.versions.find((v) => v.id === catalog.default)!;

export interface VersionOption {
  id: string;
  kind: VersionKind;
  recommended: boolean;
  /** The current page in this version, or the start of this version when it does not have it. */
  href: string;
  hasPage: boolean;
}

/**
 * The versions a reader can switch to from page `id`. The same Glaux id is the same page in every
 * version, so `pageUrl` looks it up by id; `homeUrl` is where a version without it starts.
 */
export function versionOptions(
  catalog: Catalog,
  id: string,
  pageUrl: (version: string, id: string) => string | undefined,
  homeUrl: (version: string) => string,
): VersionOption[] {
  return catalog.versions.map((v) => {
    const href = pageUrl(v.id, id);
    return { id: v.id, kind: v.kind, recommended: v.id === catalog.default, href: href ?? homeUrl(v.id), hasPage: href !== undefined };
  });
}
