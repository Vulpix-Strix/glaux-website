import { readFileSync, writeFileSync } from 'node:fs';

/** The Glaux revision the website's documentation is built from. */
export interface DocsLock {
  /** Anything `git fetch` accepts. */
  repository: string;
  /** Full 40 character commit hash. */
  commit: string;
}

export const COMMIT = /^[0-9a-f]{40}$/;

const HEADER = `# The Glaux revision the website documentation is built from.
# Production and CI build exactly this commit, never a branch.
# Move it with \`pnpm docs:pin\`; see "Updating the pinned revision" in the README.
`;

export function parseLock(text: string, where = 'glaux-docs.lock'): DocsLock {
  const values = new Map<string, string>();
  text.split('\n').forEach((raw, index) => {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) return;
    const match = /^([a-z]+)\s*=\s*(\S.*)$/.exec(line);
    if (!match) throw new Error(`${where}:${index + 1}: expected \`key = value\`, found ${JSON.stringify(line)}`);
    if (values.has(match[1])) throw new Error(`${where}:${index + 1}: \`${match[1]}\` is set twice`);
    values.set(match[1], match[2]);
  });
  for (const key of values.keys()) {
    if (key !== 'repository' && key !== 'commit') throw new Error(`${where}: unknown key \`${key}\``);
  }
  const repository = values.get('repository');
  const commit = values.get('commit');
  if (!repository) throw new Error(`${where}: \`repository\` is missing`);
  if (!commit) throw new Error(`${where}: \`commit\` is missing`);
  if (!COMMIT.test(commit)) throw new Error(`${where}: \`commit\` must be a full 40 character hash, not ${JSON.stringify(commit)}`);
  return { repository, commit };
}

export function formatLock(lock: DocsLock): string {
  return `${HEADER}repository = ${lock.repository}\ncommit = ${lock.commit}\n`;
}

export function readLock(file: string): DocsLock {
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch (error) {
    throw new Error(`cannot read ${file}: ${(error as Error).message}`);
  }
  return parseLock(text, file);
}

export function writeLock(file: string, lock: DocsLock): void {
  writeFileSync(file, formatLock(lock));
}
