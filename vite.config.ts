import react from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { paraglideOptions } from './paraglide.config.ts';
import { editorialPlugin } from './src/lib/editorial/vite.ts';
import { loadContent } from './src/lib/editorial/content.ts';
import { articleUrl } from './src/lib/editorial/model.ts';
import { ogImages } from './src/lib/og/vite.ts';

// Vite refuses to import files of `public/`, which is where `pnpm credits:sync` writes the credits
// the site serves. This exposes the small editorial one to pages as a module, so it can be rendered
// on the server, without keeping a second copy.
const creditsEditorial = (): Plugin => {
  const id = 'virtual:credits-editorial';
  const file = path.resolve(import.meta.dirname, 'public/credits/editorial.json');
  return {
    name: 'credits-editorial',
    resolveId: (source) => (source === id ? `\0${id}` : undefined),
    load(resolved) {
      if (resolved !== `\0${id}`) return;
      this.addWatchFile(file);
      return `export default ${readFileSync(file, 'utf8')};`;
    },
  };
};

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    paraglideVitePlugin(paraglideOptions),
    creditsEditorial(),
    editorialPlugin(),
    ogImages(),
    fumadocsMdx(),
    tailwindcss(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart({
      pages: [
        ...['en', 'es'].flatMap((lang) =>
          ['news', 'blog'].map((section) => ({ path: `/${lang}/${section}` })),
        ),
        ...loadContent(path.resolve('content/editorial'), false).map(({ article }) => ({
          path: articleUrl(article),
        })),
      ],
      prerender: {
        enabled: true,
        filter: (page) => !page.path.includes('?') && !page.path.endsWith('/rss.xml'),
      },
    }),
    react(),
  ],
  resolve: {
    tsconfigPaths: true,
    alias: {
      tslib: 'tslib/tslib.es6.js',
    },
  },
});
