import type { Blockquote, Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

/** GFM alert kind -> title and the type of Fumadocs' `Callout`. */
const ALERTS = {
  NOTE: { title: 'Note', type: 'info' },
  TIP: { title: 'Tip', type: 'idea' },
  IMPORTANT: { title: 'Important', type: 'info' },
  WARNING: { title: 'Warning', type: 'warning' },
  CAUTION: { title: 'Caution', type: 'error' },
} as const;

const MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*\n?/i;

/**
 * Turns GitHub-style alerts (`> [!NOTE]`), which Glaux documents use and which
 * remark-gfm does not know, into Fumadocs' `<Callout>`. Works on the AST, so
 * the source stays plain Markdown.
 */
export const remarkGithubAlerts: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'blockquote', (node: Blockquote, index, parent) => {
    const paragraph = node.children[0];
    if (paragraph?.type !== 'paragraph') return;
    const first = paragraph.children[0];
    if (first?.type !== 'text') return;
    const match = MARKER.exec(first.value);
    if (!match) return;

    const { title, type } = ALERTS[match[1].toUpperCase() as keyof typeof ALERTS];
    first.value = first.value.slice(match[0].length);
    if (first.value === '') paragraph.children.shift();
    const children = paragraph.children.length === 0 ? node.children.slice(1) : node.children;

    // `mdxJsxFlowElement` is not in mdast's types without mdast-util-mdx-jsx.
    const callout = {
      type: 'mdxJsxFlowElement',
      name: 'Callout',
      attributes: [
        { type: 'mdxJsxAttribute', name: 'type', value: type },
        { type: 'mdxJsxAttribute', name: 'title', value: title },
      ],
      children,
    };
    (parent!.children as unknown[])[index!] = callout;
  });
};
