import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { evaluate } from '@mdx-js/mdx';
import { applyMdxPreset } from 'fumadocs-mdx/config';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import * as runtime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { glauxMdxOptions } from '@/lib/glaux/mdx-options';

export const root = path.resolve(import.meta.dirname, '..');
export const fixtures = path.join(root, 'test/fixtures/docs');
/** The real manual. Tests that need it are skipped when the repository is not next to this one. */
export const glauxDocs = path.resolve(process.env.GLAUX_DOCS_DIR ?? path.join(root, '../glaux/docs'));

export const tempDir = () => mkdtempSync(path.join(tmpdir(), 'glaux-website-'));

/** Writes `files` (path below `dir` -> text) and returns `dir`. */
export function writeTree(dir: string, files: Record<string, string>): string {
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

/** Compiles a synced page with the options the site uses, and renders it with Fumadocs' components. */
export async function render(contentDir: string, id: string, lang = 'en') {
  const options = await applyMdxPreset(glauxMdxOptions(contentDir))('runtime');
  const file = path.join(contentDir, lang, `${id}.md`);
  const { default: Content } = await evaluate(
    // The loader that compiles the site's pages has taken the frontmatter off by now.
    { path: file, value: readFileSync(file, 'utf8').replace(/^---\n[^]*?\n---\n/, '') },
    { ...runtime, ...options, format: 'md' } as never,
  );
  return renderToStaticMarkup(Content({ components: defaultMdxComponents } as never) as never);
}
