import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import type { DocsLock } from './lock.ts';

function git(cwd: string, ...args: string[]): string {
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
 * The commit a Glaux `docs/` directory is at: the HEAD of the repository it is the `docs/`
 * of. `undefined` for any other directory, such as test fixtures inside another repository.
 */
export function docsCommit(docsDir: string): string | undefined {
  try {
    const top = git(docsDir, 'rev-parse', '--show-toplevel');
    return path.join(realpathSync(top), 'docs') === realpathSync(docsDir) ? git(docsDir, 'rev-parse', 'HEAD') : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Makes `cacheDir` a checkout of just the `docs/` directory at the locked commit and returns
 * the path of `docs/`. A checkout that already is at that commit is reused. Nothing is
 * resolved from a branch: the commit is fetched by its hash, so the result is the same
 * whatever `main` is now.
 * Pass `docsOnly = false` with a separate cache for validators that need the full source.
 */
export function fetchLockedDocs(lock: DocsLock, cacheDir: string, docsOnly = true): string {
  const docs = path.join(cacheDir, 'docs');
  const atCommit = () => existsSync(path.join(cacheDir, '.git')) && localCommit(cacheDir) === lock.commit;
  if (!(atCommit() && statSync(docs, { throwIfNoEntry: false })?.isDirectory() && git(cacheDir, 'status', '--porcelain', '--', ...(docsOnly ? ['docs'] : [])) === '')) {
    rmSync(cacheDir, { recursive: true, force: true });
    mkdirSync(cacheDir, { recursive: true });
    git(cacheDir, 'init', '--quiet');
    git(cacheDir, 'remote', 'add', 'origin', lock.repository);
    if (docsOnly) git(cacheDir, 'sparse-checkout', 'set', 'docs');
    try {
      git(cacheDir, 'fetch', '--quiet', '--depth', '1', '--filter=blob:none', 'origin', lock.commit);
      git(cacheDir, 'checkout', '--quiet', '--detach', 'FETCH_HEAD');
    } catch (error) {
      rmSync(cacheDir, { recursive: true, force: true });
      throw new Error(
        `cannot fetch Glaux commit ${lock.commit} from ${lock.repository}. ` +
          `Anonymous download requires a public repository and a pushed commit; no local fallback is used.\n${(error as Error).message}`,
      );
    }
    if (localCommit(cacheDir) !== lock.commit) {
      throw new Error(`fetched ${localCommit(cacheDir)} instead of ${lock.commit}`);
    }
  }
  if (!statSync(docs, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`Glaux commit ${lock.commit} has no docs/ directory`);
  }
  return docs;
}

/** Resolves a branch, tag or hash of `repository` to a full commit hash, asking the remote. */
export function resolveRemoteRef(repository: string, ref: string): string {
  const out = git(process.cwd(), 'ls-remote', repository, ref);
  const lines = out.split('\n').filter(Boolean);
  // `ls-remote` matches by suffix, so prefer the exact branch or tag.
  const exact =
    lines.find((l) => l.endsWith(`\trefs/heads/${ref}`)) ??
    lines.find((l) => l.endsWith(`\trefs/tags/${ref}^{}`)) ??
    lines.find((l) => l.endsWith(`\trefs/tags/${ref}`)) ??
    lines.find((l) => l.endsWith(`\t${ref}`));
  if (!exact) throw new Error(`${repository} has no branch or tag named ${ref}`);
  return exact.split('\t')[0];
}
