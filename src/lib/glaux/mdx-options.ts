import { readFileSync } from 'node:fs';
import path from 'node:path';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins';
import type { DefaultMDXOptions, MDXPresetOptions } from 'fumadocs-mdx/config';
import { remarkGithubAlerts } from './remark-github-alerts.ts';
import { remarkGlauxAnchors } from './remark-glaux-anchors.ts';
import { remarkGlauxLinks } from './remark-glaux-links.ts';

/**
 * The Rhai TextMate grammar of the rhaiscript organization (vscode-rhai, MPL-2.0), unchanged.
 * Shiki bundles Luau but not Rhai. See `grammars/README.md`.
 */
const rhaiGrammar = JSON.parse(
  readFileSync(path.join(import.meta.dirname, 'grammars/rhai.tmLanguage.json'), 'utf8'),
);

/** Syntax highlighting shared by the imported manual and local editorial MDX. */
export const glauxCodeOptions: DefaultMDXOptions['rehypeCodeOptions'] = {
  ...rehypeCodeDefaultOptions,
  langs: [{ ...rhaiGrammar, name: 'rhai' }],
  // The page tells Luau and Rhai samples apart by this attribute.
  transformers: [
    ...(rehypeCodeDefaultOptions.transformers ?? []),
    {
      pre(node) {
        node.properties['data-language'] = this.options.lang;
      },
    },
  ],
};

/**
 * MDX options for the Glaux pages below `contentDir`, which holds one directory per version.
 * Fumadocs adds its own plugins (GFM, headings, code) around these.
 */
export function glauxMdxOptions(contentDir: string): MDXPresetOptions {
  return {
    rehypeCodeOptions: glauxCodeOptions,
    // Glaux images are local files; never fetch a remote one to measure it during a build.
    remarkImageOptions: { external: false },
    remarkPlugins: [
      // Runs after Fumadocs' heading plugin and replaces the ids it derived; its table of
      // contents and the search index are built later and read the final ids.
      [remarkGlauxAnchors, { contentDir }],
      remarkGithubAlerts,
      [remarkGlauxLinks, { contentDir }],
    ],
  };
}
