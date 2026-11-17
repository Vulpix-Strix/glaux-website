import { llms, loader } from 'fumadocs-core/source';
import { defineDocs } from 'fumadocs-mdx/macro';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import type { Node, Root } from 'fumadocs-core/page-tree';
import { i18n } from './i18n.ts';
import { applyMdxPreset } from 'fumadocs-mdx/config';
import { glauxMdxOptions } from '../glaux/mdx-options.ts';
import path from 'node:path';
import { catalog } from './catalog.ts';
import { versionSource, type DocsPages } from './versions.ts';

// `content/glaux` is generated from the Glaux repository by `pnpm docs:sync`, one directory per
// version. A single collection covers them all, so a new release needs no configuration.
export const docs = defineDocs({
  dir: 'content/glaux',
  docs: {
    async: true,
    mdxOptions: applyMdxPreset(glauxMdxOptions(path.resolve('content/glaux'))),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

export { catalog };

const files = docs.toFumadocsSource();
const createSource = (version: string) =>
  loader({
    source: versionSource(files, version),
    baseUrl: `/docs/${version}`,
    i18n,
    plugins: [lucideIconsPlugin()],
  });
type DocsSource = ReturnType<typeof createSource>;

const sources = new Map<string, DocsSource>(catalog.versions.map((v) => [v.id, createSource(v.id)]));

/** The pages of one version. Throws for a version the catalog does not list. */
export function getSource(version: string): DocsSource {
  const found = sources.get(version);
  if (!found) throw new Error(`unknown documentation version ${version}`);
  return found;
}

export const isVersion = (value: string | undefined): value is string => value !== undefined && sources.has(value);

/** The collection entry of a page, by its path below the version. */
export const getDocsEntry = (version: string, pagePath: string) => docs.getPage(`${version}/${pagePath}`);

function firstPage(nodes: Node[]): string | undefined {
  for (const node of nodes) {
    if (node.type === 'page') return node.url;
    if (node.type === 'folder') {
      const url = node.index?.url ?? firstPage(node.children);
      if (url) return url;
    }
  }
  return undefined;
}

/** The pages of every version in `lang`, as {@link resolveDocsPath} reads them. */
export function docsPages(lang: string): DocsPages {
  return {
    has: (version, slugs) => isVersion(version) && getSource(version).getPage(slugs, lang) !== undefined,
    home(version) {
      if (!isVersion(version)) return undefined;
      const tree: Root = getSource(version).getPageTree(lang);
      const url = firstPage(tree.children);
      return url?.split('/').slice(4);
    },
  };
}

/** The Glaux id of a page, `guide/getting-started`, from its path below the version, `en/guide/getting-started.md`. */
export const pageId = (pagePath: string) => pagePath.split('/').slice(1).join('/').replace(/\.md$/, '');

/** The recommended version, which `llms.txt` and search outside the manual describe. */
export const docsLlms = llms(getSource(catalog.default), {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText('processed')}`,
});
