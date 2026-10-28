import { readFileSync } from 'node:fs';

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

/** Where the documentation came from. */
export interface ManifestSource {
  kind: 'local' | 'locked';
  /** The Glaux commit, when the source is a Git checkout. */
  commit?: string;
}

/** The language every other language falls back to, as in Glaux. */
export const FALLBACK_LANGUAGE = 'en';

export interface Manifest {
  source: ManifestSource;
  /** language -> id -> page */
  languages: Record<string, Record<string, ManifestPage>>;
  /** language -> page ids in editorial order, including those only the fallback language has. */
  order: Record<string, string[]>;
  /** language -> ids of fallback pages that have no translation yet. */
  missing: Record<string, string[]>;
}

export function readManifest(path: string): Manifest {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Manifest;
  } catch (error) {
    throw new Error(
      `cannot read the Glaux docs manifest at ${path}; run \`pnpm docs:sync\` first (${String(error)})`,
    );
  }
}
