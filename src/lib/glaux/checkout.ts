import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';

/** A Glaux commit and the repository it is fetched from. */
export interface Revision {
  /** Anything `git fetch` accepts. */
  repository: string;
  /** Full 40 character commit hash. */
  commit: string;
}

export const COMMIT = /^[0-9a-f]{40}$/;

export function git(cwd: string, ...args: string[]): string {
  try {
    // Ignore user/system credentials and injected Git configuration. Local paths used by
    // development and fixtures still work; remote operations remain anonymous.
    const env = {
      ...process.env,
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_COUNT: '0',
      GIT_CONFIG_PARAMETERS: '',
      GIT_TERMINAL_PROMPT: '0',
      GIT_ASKPASS: '',
    };
    return execFileSync('git', ['-c', 'credential.helper=', '-c', 'core.askPass=', '-c', 'http.extraHeader=', ...args], {
      cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const detail = String((error as { stderr?: Buffer | string }).stderr ?? error).trim();
    throw new Error(`git ${args[0]} failed in ${cwd}: ${detail}`);
  }
}

/** The commit a local checkout is at, or `undefined` when `dir` is not inside a Git work tree. */
export function localCommit(dir: string): string | undefined {
  try {
    return git(dir, 'rev-parse', 'HEAD');
  } catch {
    return undefined;
  }
}

/**
 * Makes `cacheDir` a checkout of just the `docs/` directory at `revision.commit` and returns
 * the path of `docs/`. A checkout that already is at that commit is reused. Nothing is
 * resolved from a branch: the commit is fetched by its hash, so the result is the same
 * whatever `main` is now.
 * Pass `docsOnly = false` with a separate cache for validators that need the full source.
 */
export function fetchDocs(revision: Revision, cacheDir: string, docsOnly = true): string {
  const docs = path.join(cacheDir, 'docs');
  const atCommit = () => existsSync(path.join(cacheDir, '.git')) && localCommit(cacheDir) === revision.commit;
  if (!(atCommit() && statSync(docs, { throwIfNoEntry: false })?.isDirectory() && git(cacheDir, 'status', '--porcelain', '--', ...(docsOnly ? ['docs'] : [])) === '')) {
    rmSync(cacheDir, { recursive: true, force: true });
    mkdirSync(cacheDir, { recursive: true });
    git(cacheDir, 'init', '--quiet');
    git(cacheDir, 'remote', 'add', 'origin', revision.repository);
    if (docsOnly) git(cacheDir, 'sparse-checkout', 'set', 'docs');
    try {
      git(cacheDir, 'fetch', '--quiet', '--depth', '1', '--filter=blob:none', 'origin', revision.commit);
      git(cacheDir, 'checkout', '--quiet', '--detach', 'FETCH_HEAD');
    } catch (error) {
      rmSync(cacheDir, { recursive: true, force: true });
      throw new Error(
        `cannot fetch Glaux commit ${revision.commit} from ${revision.repository}. ` +
          `Anonymous download requires a public repository and a pushed commit; no local fallback is used.\n${(error as Error).message}`,
      );
    }
    if (localCommit(cacheDir) !== revision.commit) {
      throw new Error(`fetched ${localCommit(cacheDir)} instead of ${revision.commit}`);
    }
  }
  if (!statSync(docs, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`Glaux commit ${revision.commit} has no docs/ directory`);
  }
  return docs;
}
