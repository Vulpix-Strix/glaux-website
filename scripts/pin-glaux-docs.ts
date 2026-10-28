// Usage: node scripts/pin-glaux-docs.ts [<branch | tag | commit>] [--local]
// Moves glaux-docs.lock to a Glaux revision and checks that its docs/ can be fetched.
//   (nothing)  the head of the lock's repository (its default branch)
//   <ref>      that branch or tag of the lock's repository, or a full commit hash
//   --local    the commit the sibling checkout (../glaux or GLAUX_DOCS_DIR/..) is at
import path from 'node:path';
import { fetchLockedDocs, docsCommit, resolveRemoteRef } from '../src/lib/glaux/checkout.ts';
import { CACHE_DIR, LOCK_FILE } from '../src/lib/glaux/docs-source.ts';
import { COMMIT, readLock, writeLock } from '../src/lib/glaux/lock.ts';

const root = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const ref = args.find((a) => !a.startsWith('--')) ?? 'HEAD';

try {
  const lockFile = path.join(root, LOCK_FILE);
  const previous = readLock(lockFile);
  let commit: string;
  if (args.includes('--local')) {
    const docs = path.resolve(root, process.env.GLAUX_DOCS_DIR ?? '../glaux/docs');
    const found = docsCommit(docs);
    if (!found) throw new Error(`${docs} is not inside a Git checkout`);
    commit = found;
  } else {
    commit = COMMIT.test(ref) ? ref : resolveRemoteRef(previous.repository, ref);
  }

  // Fetching proves the commit is pushed and has docs/ before the lock points at it.
  const next = { ...previous, commit };
  fetchLockedDocs(next, path.join(root, CACHE_DIR));
  writeLock(lockFile, next);
  console.log(commit === previous.commit ? `${LOCK_FILE} already pins ${commit}` : `${LOCK_FILE}: ${previous.commit} -> ${commit}`);
  console.log('Next: pnpm docs:sync --locked && pnpm test, then commit the lock file.');
} catch (error) {
  console.error(`docs:pin failed: ${(error as Error).message}`);
  process.exit(1);
}
