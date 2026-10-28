import path from 'node:path';
import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { GlauxLinkError, resolveLink } from './links.ts';
import { readManifest } from './manifest.ts';

export interface RemarkGlauxLinksOptions {
  /** Directory the sync step generated; its first level is the language. */
  contentDir: string;
  manifestPath: string;
}

/**
 * Rewrites the `glaux://<id>[#fragment]` links of a page to website URLs. The
 * language comes from the page's folder below `contentDir`. A link that does
 * not resolve fails the compilation of the page.
 */
export const remarkGlauxLinks: Plugin<[RemarkGlauxLinksOptions], Root> =
  ({ contentDir, manifestPath }) =>
  (tree, file) => {
    if (!file.path) return;
    const relative = path.relative(contentDir, file.path);
    if (relative.startsWith('..')) return; // not a Glaux page
    const [lang, ...rest] = relative.split(path.sep);
    const pageId = rest.join('/').replace(/\.mdx?$/, '');
    const manifest = readManifest(manifestPath);

    visit(tree, (node) => {
      if (node.type !== 'link' && node.type !== 'definition') return;
      try {
        node.url = resolveLink(node.url, { manifest, lang, pageId });
      } catch (error) {
        if (!(error instanceof GlauxLinkError)) throw error;
        file.fail(error.message, node, `remark-glaux-links:${error.code}`);
      }
    });
  };
