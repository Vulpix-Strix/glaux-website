import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';
import type { ContentAsset } from './content.ts';

// Minimal shapes of the MDX JSX nodes; mdast-util-mdx-jsx is not a direct dependency.
interface MdxJsxAttribute {
  type: 'mdxJsxAttribute' | 'mdxJsxExpressionAttribute';
  name?: string;
  value?: unknown;
}
interface MdxJsxElement {
  name: string | null;
  attributes: MdxJsxAttribute[];
}

const number = (name: string, value: number): MdxJsxAttribute => ({
  type: 'mdxJsxAttribute',
  name,
  value: {
    type: 'mdxJsxAttributeValueExpression',
    value: String(value),
    data: {
      estree: {
        type: 'Program',
        sourceType: 'module',
        body: [{ type: 'ExpressionStatement', expression: { type: 'Literal', value, raw: String(value) } }],
      },
    },
  },
});

/**
 * Adds the pixel size read from local assets to Markdown images and `<ArticleFigure>`, unless the
 * author wrote explicit dimensions. Runs after `asset:` references became `/editorial-assets/` URLs.
 */
export function remarkAssetSize(assets: Map<string, ContentAsset>) {
  return (tree: Root) => {
    visit(tree, (node) => {
      if (node.type === 'image') {
        const asset = assets.get(node.url);
        if (asset?.width && asset.height)
          node.data = { hProperties: { width: asset.width, height: asset.height } };
      }
      if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') return;
      const element = node as unknown as MdxJsxElement;
      if (element.name !== 'ArticleFigure') return;
      const src = element.attributes.find((attribute) => attribute.name === 'src')?.value;
      const asset = typeof src === 'string' ? assets.get(src) : undefined;
      const sized = element.attributes.some((a) => a.name === 'width' || a.name === 'height');
      if (asset?.width && asset.height && !sized)
        element.attributes.push(number('width', asset.width), number('height', asset.height));
    });
  };
}
