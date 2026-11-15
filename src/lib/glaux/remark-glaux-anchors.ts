import type { Heading, Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { assignAnchors, inlineText } from './anchor.ts';
import { locatePage, readManifest } from './manifest.ts';

export interface RemarkGlauxAnchorsOptions {
  /** Directory the sync step generated; its first level is the version, then the language. */
  contentDir: string;
}

/**
 * Gives every heading the `id` Glaux gives it, so a `#fragment` written for the Glaux
 * viewer lands on the same heading here. Fumadocs would otherwise derive ids with
 * `github-slugger`, which treats punctuation differently. Runs after Fumadocs' own
 * heading plugin and overwrites the `id` it set.
 */
export const remarkGlauxAnchors: Plugin<[RemarkGlauxAnchorsOptions], Root> =
  ({ contentDir }) =>
  (tree, file) => {
    if (!file.path) return;
    const location = locatePage(contentDir, file.path);
    if (!location) return; // not a Glaux page
    const { relative, lang, id, manifestPath } = location;
    const page = readManifest(manifestPath).languages[lang]?.[id];
    if (!page) return file.fail(`${relative} is not in the manifest; run \`pnpm docs:sync\``, undefined, 'remark-glaux-anchors:unknown-page');

    // Glaux only sees the headings at the top level, so those claim the anchors first.
    const topLevel = tree.children.filter((n): n is Heading => n.type === 'heading');
    const nested: Heading[] = [];
    visit(tree, 'heading', (node: Heading, _index, parent) => {
      if (parent !== tree) nested.push(node);
    });
    const assigned = assignAnchors(
      page.title,
      topLevel.map((n) => inlineText(n)),
      nested.map((n) => inlineText(n)),
    );
    if (assigned.anchors.join(' ') !== page.anchors.join(' ')) {
      file.fail(
        `the headings of ${relative} do not match the anchors recorded by the sync step; run \`pnpm docs:sync\``,
        undefined,
        'remark-glaux-anchors:stale-manifest',
      );
    }

    [...topLevel, ...nested].forEach((node, index) => {
      node.data ??= {};
      node.data.hProperties = { ...node.data.hProperties, id: assigned.ids[index] };
    });
  };
