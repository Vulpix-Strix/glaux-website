import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { evaluate } from '@mdx-js/mdx';
import { applyMdxPreset } from 'fumadocs-mdx/config';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import * as runtime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { glauxMdxOptions } from '@/lib/glaux/mdx-options';
import { CATALOG_FILE, defaultVersion, readCatalog } from '@/lib/glaux/versions';

export const root = path.resolve(import.meta.dirname, '..');
export const fixtures = path.join(root, 'test/fixtures/docs');
/**
 * The version of the real manual the site shows, as the last `pnpm docs:sync` left it. Tests
 * that need it are skipped locally before a sync, and fail in CI, which always builds first.
 */
function publishedVersion() {
  const contentDir = path.join(root, 'content/glaux');
  if (!existsSync(path.join(contentDir, CATALOG_FILE))) {
    if (process.env.CI) throw new Error(`${contentDir}/${CATALOG_FILE} is missing; run pnpm build before the tests`);
    return undefined;
  }
  return defaultVersion(readCatalog(contentDir));
}
const published = publishedVersion();
const missing = path.join(root, '.cache/not-synced');
/** `docs/` of the Glaux commit of the default version. */
export const glauxDocs = published ? path.join(root, '.cache/glaux-source', published.commit, 'docs') : missing;
/** The synced output of the default version, `content/glaux/<version>`. */
export const publishedDocs = published ? path.join(root, 'content/glaux', published.id) : missing;
/** The Glaux credit files `pnpm credits:glaux` checked out for the default version. */
export const glauxCredits = published ? path.join(root, '.cache/glaux-credits') : missing;

export const tempDir = () => mkdtempSync(path.join(tmpdir(), 'glaux-website-'));

/** Writes `files` (path below `dir` -> contents) and returns `dir`. */
export function writeTree(dir: string, files: Record<string, string | Buffer>): string {
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    writeFileSync(path.join(dir, file), text);
  }
  return dir;
}

export function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
  );
}

/** A hash per file below `dir`, to compare two trees byte for byte. */
export const digest = (dir: string) =>
  walk(dir)
    .sort()
    .map((f) => `${path.relative(dir, f)} ${createHash('sha256').update(readFileSync(f)).digest('hex')}`)
    .join('\n');

/**
 * Compiles a page of a synced version with the options the site uses, and renders it with
 * Fumadocs' components. `versionDir` is the output of `syncDocs`, read as one version of its parent.
 */
export async function render(versionDir: string, id: string, lang = 'en') {
  const options = await applyMdxPreset(glauxMdxOptions(path.dirname(versionDir)))('runtime');
  const file = path.join(versionDir, lang, `${id}.md`);
  const { default: Content } = await evaluate(
    // The loader that compiles the site's pages has taken the frontmatter off by now.
    { path: file, value: readFileSync(file, 'utf8').replace(/^---\n[^]*?\n---\n/, '') },
    { ...runtime, ...options, format: 'md' } as never,
  );
  return renderToStaticMarkup(Content({ components: defaultMdxComponents } as never) as never);
}
