import { llms, loader } from 'fumadocs-core/source';
import { defineDocs } from 'fumadocs-mdx/macro';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { i18n } from './i18n.ts';
import { applyMdxPreset } from 'fumadocs-mdx/config';
import { glauxMdxOptions } from '../glaux/mdx-options.ts';
import path from 'node:path';

// `content/glaux` is generated from the Glaux repository by `pnpm docs:sync`.
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

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: '/docs',
  i18n,
  plugins: [lucideIconsPlugin()],
});

export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText('processed')}`,
});
