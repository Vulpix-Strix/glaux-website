import { readFileSync } from 'node:fs';
import path from 'node:path';

/** One page as the sync step saw it. `id` is the path below the language directory, as in Glaux. */
export interface ManifestPage {
  id: string;
  title: string;
  description?: string;
  /**
   * Anchor of the level 1 heading. It is the page title, not a heading of the body, so a
   * link to it opens the top of the page.
   */
  titleAnchor: string;
  /** Anchors of the headings of the body, computed the way Glaux computes them. */
  anchors: string[];
}

/** The Glaux version and commit the documentation was read from. */
export interface ManifestSource {
  version: string;
  commit: string;
}

/** The language every other language falls back to, as in Glaux. */
export const FALLBACK_LANGUAGE = 'en';

export interface Manifest {
  source?: ManifestSource;
  /** language -> id -> page */
  languages: Record<string, Record<string, ManifestPage>>;
  /** language -> page ids in editorial order, including those only the fallback language has. */
  order: Record<string, string[]>;
  /** language -> ids of fallback pages that have no translation yet. */
  missing: Record<string, string[]>;
}

export function readManifest(file: string): Manifest {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Manifest;
  } catch (error) {
    throw new Error(
      `cannot read the Glaux docs manifest at ${file}; run \`pnpm docs:sync\` first (${String(error)})`,
    );
  }
}

export interface PageLocation {
  /** Path of the file below the content directory. */
  relative: string;
  lang: string;
  id: string;
  /** The manifest of the version the page belongs to. */
  manifestPath: string;
}

/**
 * Locates a synced page, `<version>/<lang>/<id>.md` below `contentDir`. Returns `undefined`
 * for a file outside it.
 */
export function locatePage(contentDir: string, file: string): PageLocation | undefined {
  const relative = path.relative(contentDir, file);
  if (relative.startsWith('..')) return undefined;
  const [version, lang, ...rest] = relative.split(path.sep);
  return {
    relative,
    lang,
    id: rest.join('/').replace(/\.mdx?$/, ''),
    manifestPath: path.join(contentDir, version, 'manifest.json'),
  };
}
