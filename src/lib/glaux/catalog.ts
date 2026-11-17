// The catalog of documented versions. Free of Node APIs, so the site can read it at runtime.

/** Id of the documentation of the development branch. Ids are also URL segments. */
export const DEVELOPMENT = 'dev';
/** URL segment that redirects to the latest release, so no release may use it. */
export const STABLE = 'stable';

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
  /** Id of the version the site recommends: the latest release, else the latest prerelease, else development. */
  default: string;
  /** Releases newest first, then development. */
  versions: Version[];
}

/** The latest stable release, if there is one. */
export const latestRelease = (catalog: Catalog): Version | undefined => catalog.versions.find((v) => v.kind === 'release');
