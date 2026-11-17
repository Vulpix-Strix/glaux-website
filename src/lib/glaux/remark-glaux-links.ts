import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { GlauxLinkError, resolveLink } from './links.ts';
import { locatePage, readManifest } from './manifest.ts';

export interface RemarkGlauxLinksOptions {
  /** Directory the sync step generated; its first level is the version, then the language. */
  contentDir: string;
}

/**
 * Rewrites the `glaux://<id>[#fragment]` links of a page to website URLs of the same version.
 * The version and language come from the page's folders below `contentDir`. A link that does
 * not resolve fails the compilation of the page.
 */
export const remarkGlauxLinks: Plugin<[RemarkGlauxLinksOptions], Root> =
  ({ contentDir }) =>
  (tree, file) => {
    if (!file.path) return;
    const location = locatePage(contentDir, file.path);
    if (!location) return; // not a Glaux page
    const { version, lang, id: pageId, manifestPath } = location;
    const manifest = readManifest(manifestPath);

    visit(tree, (node) => {
      if (node.type !== 'link' && node.type !== 'definition') return;
      try {
        node.url = resolveLink(node.url, { manifest, lang, version, pageId });
      } catch (error) {
        if (!(error instanceof GlauxLinkError)) throw error;
        file.fail(error.message, node, `remark-glaux-links:${error.code}`);
      }
    });
  };
