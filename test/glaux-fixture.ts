import { execFileSync } from 'node:child_process';
import type { Release } from '@/lib/glaux/versions';
import { tempDir, writeTree } from './helpers.ts';

/** A local Git repository that answers fetches by commit hash, as GitHub does. */
export function gitRepository() {
  const repo = tempDir();
  const git = (...args: string[]) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', '-c', 'tag.gpgsign=false', ...args], {
      cwd: repo,
      encoding: 'utf8',
    }).trim();
  git('init', '--quiet', '--initial-branch=main');
  git('config', 'uploadpack.allowAnySHA1InWant', 'true');
  const commit = (message: string, files: Record<string, string | Buffer>) => {
    writeTree(repo, files);
    git('add', '.');
    git('commit', '--quiet', '-m', message);
    return git('rev-parse', 'HEAD');
  };
  return { repo, git, commit };
}

export const release = (tag: string, publishedAt: string | null, extra: Partial<Release> = {}): Release => ({
  tag_name: tag,
  draft: false,
  prerelease: false,
  published_at: publishedAt,
  ...extra,
});

/** Answers the GitHub releases API with `releases`, one page of 100 at a time, and records the URLs asked for. */
export function github(releases: Release[], status = 200) {
  const urls: string[] = [];
  const fetchImpl = (async (url: string) => {
    urls.push(url);
    const page = Number(new URL(url).searchParams.get('page'));
    return new Response(JSON.stringify(releases.slice((page - 1) * 100, page * 100)), { status });
  }) as typeof fetch;
  return { fetchImpl, urls };
}
