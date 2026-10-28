import path from 'node:path';
import { fetchLockedDocs, docsCommit } from './checkout.ts';
import { readLock } from './lock.ts';
import type { ManifestSource } from './manifest.ts';

export interface DocsSourceRequest {
  /** The website repository. */
  root: string;
  /** `--source`: a `docs/` directory to read as it is. */
  source?: string;
  /** `--locked`: build the revision pinned in the lock file. */
  locked?: boolean;
  env?: Record<string, string | undefined>;
}

export interface DocsSource {
  docsDir: string;
  manifest: ManifestSource;
  /** What the person running the sync should know, if anything. */
  notices: string[];
}

export const LOCK_FILE = 'glaux-docs.lock';
/** Where the pinned revision is checked out; git-ignored. */
export const CACHE_DIR = '.cache/glaux-source';

/**
 * Decides where the documentation comes from.
 *
 * - `--locked` or `GLAUX_DOCS_LOCKED=1`: the commit in `glaux-docs.lock`, fetched with Git.
 *   This is what CI and production use, and it ignores any local checkout.
 * - `--source <dir>` or `GLAUX_DOCS_DIR`: that directory, for development.
 * - Otherwise `../glaux/docs`, the sibling checkout, for development.
 */
export function resolveDocsSource({ root, source, locked, env = {} }: DocsSourceRequest): DocsSource {
  const lockFile = path.join(root, LOCK_FILE);
  const wantsLocked = locked ?? ['1', 'true'].includes(env.GLAUX_DOCS_LOCKED ?? '');
  if (wantsLocked && source) throw new Error('--locked and --source cannot be combined');

  if (wantsLocked) {
    const lock = readLock(lockFile);
    const docsDir = fetchLockedDocs(lock, path.join(root, CACHE_DIR));
    return { docsDir, manifest: { kind: 'locked', commit: lock.commit }, notices: [] };
  }

  const docsDir = path.resolve(root, source ?? env.GLAUX_DOCS_DIR ?? '../glaux/docs');
  const commit = docsCommit(docsDir);
  const notices: string[] = [];
  try {
    const pinned = readLock(lockFile).commit;
    if (commit !== undefined && commit !== pinned) {
      notices.push(`${docsDir} is at ${commit.slice(0, 10)} but ${LOCK_FILE} pins ${pinned.slice(0, 10)}; CI and production build the pinned one (--locked)`);
    }
  } catch {
    // The lock only matters to --locked, so a development checkout works without it.
  }
  return { docsDir, manifest: { kind: 'local', commit }, notices };
}
