import { llms, loader } from 'fumadocs-core/source';
import { defineDocs } from 'fumadocs-mdx/macro';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { i18n } from './i18n.ts';
import { applyMdxPreset } from 'fumadocs-mdx/config';
import { glauxMdxOptions } from '../glaux/mdx-options.ts';
import path from 'node:path';
import type { Catalog } from '../glaux/versions.ts';
import catalog from '../../../content/glaux/versions.json';
import { versionSource } from './versions.ts';

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

/** The version the site shows until it has routes per version. */
export const docsVersion = (catalog as Catalog).default;

export const source = loader({
  source: versionSource(docs.toFumadocsSource(), docsVersion),
  baseUrl: '/docs',
  i18n,
  plugins: [lucideIconsPlugin()],
});

/** The collection entry of a page of {@link source}, by its path below the version. */
export const getDocsEntry = (pagePath: string) => docs.getPage(`${docsVersion}/${pagePath}`);

export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText('processed')}`,
});
