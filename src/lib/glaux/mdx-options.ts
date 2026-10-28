import { readFileSync } from 'node:fs';
import path from 'node:path';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins';
import type { MDXPresetOptions } from 'fumadocs-mdx/config';
import { remarkGithubAlerts } from './remark-github-alerts.ts';
import { remarkGlauxAnchors } from './remark-glaux-anchors.ts';
import { remarkGlauxLinks } from './remark-glaux-links.ts';

/**
 * The Rhai TextMate grammar of the rhaiscript organization (vscode-rhai, MPL-2.0), unchanged.
 * Shiki bundles Luau but not Rhai. See `grammars/README.md`.
 */
const rhaiGrammar = JSON.parse(readFileSync(path.join(import.meta.dirname, 'grammars/rhai.tmLanguage.json'), 'utf8'));

/**
 * MDX options for Glaux pages. Fumadocs adds its own plugins (GFM, headings,
 * code) around these.
 */
export function glauxMdxOptions(contentDir: string): MDXPresetOptions {
  const manifestPath = path.join(contentDir, 'manifest.json');
  return {
    // `langs` makes Shiki load the grammar up front; Luau is bundled and loads by itself.
    rehypeCodeOptions: { ...rehypeCodeDefaultOptions, langs: [{ ...rhaiGrammar, name: 'rhai' }] },
    // Glaux images are local files; never fetch a remote one to measure it during a build.
    remarkImageOptions: { external: false },
    remarkPlugins: [
      // Runs after Fumadocs' heading plugin and replaces the ids it derived; its table of
      // contents and the search index are built later and read the final ids.
      [remarkGlauxAnchors, { contentDir, manifestPath }],
      remarkGithubAlerts,
      [remarkGlauxLinks, { contentDir, manifestPath }],
    ],
  };
}
