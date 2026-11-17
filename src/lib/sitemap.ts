// Build-time only: reads the editorial content and the synced documentation.
import path from 'node:path';
import type { Plugin } from 'vite';
import { loadContent } from './editorial/content.ts';
import { articleUrl, sections } from './editorial/model.ts';
import { docUrl } from './glaux/links.ts';
import { readCatalog, syncedPages } from './glaux/versions.ts';
import { isPublishedLanguage } from './i18n.ts';
import { absoluteUrl } from './site.ts';

export interface SitemapSources {
  /** `content/editorial`. */
  editorial: string;
  /** `content/glaux`. */
  docs: string;
  /** The site languages. */
  locales: readonly string[];
}

/**
 * The public pages of the site, by their canonical URL. The documentation is the recommended
 * version only, under its versioned URLs; aliases and URLs without a version redirect, so they are left out.
 */
export function sitemapPaths({ editorial, docs, locales }: SitemapSources): string[] {
  const recommended = readCatalog(docs).default;
  return [
    ...locales.flatMap((lang) => [`/${lang}`, `/${lang}/credits`, ...sections.map((section) => `/${lang}/${section}`)]),
    ...loadContent(editorial, false).map(({ article }) => articleUrl(article)),
    ...syncedPages(docs)
      .filter((page) => page.version === recommended && isPublishedLanguage(page.lang))
      .map((page) => docUrl(page.lang, page.version, page.id)),
  ];
}

export function renderSitemap(paths: string[]): string {
  const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const urls = paths.map((page) => `  <url><loc>${escape(absoluteUrl(page))}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/** Writes `sitemap.xml` into the client build. */
export function sitemap(): Plugin {
  let root = process.cwd();
  return {
    name: 'glaux-sitemap',
    apply: 'build',
    configResolved(config) {
      root = config.root;
    },
    async generateBundle() {
      if (this.environment.name !== 'client') return;
      // The Paraglide runtime is compiled after Vite loads its config, so it is read on use.
      const { locales }: typeof import('../paraglide/runtime.js') = await import(new URL('../paraglide/runtime.js', import.meta.url).href);
      const paths = sitemapPaths({ editorial: path.join(root, 'content/editorial'), docs: path.join(root, 'content/glaux'), locales });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: renderSitemap(paths) });
    },
  };
}
