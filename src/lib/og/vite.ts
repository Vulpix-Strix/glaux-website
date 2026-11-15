import path from 'node:path';
import type { Plugin } from 'vite';
import { defaultVersionDir } from '../glaux/versions.ts';
import { ogImagePath } from './model.ts';

// `entries.ts` reads the compiled Paraglide messages, which the Paraglide plugin writes after
// Vite has loaded its config. Loading these modules on first use keeps a clean checkout building.
const load = async () => {
  const entries: typeof import('./entries.ts') = await import(new URL('./entries.ts', import.meta.url).href);
  const render: typeof import('./render.ts') = await import(new URL('./render.ts', import.meta.url).href);
  return { ...entries, ...render };
};

/** Draws the Open Graph card of every published page into the client build, at `ogImagePath`. */
export function ogImages(): Plugin {
  let root = process.cwd();
  let development = false;
  const sources = () => ({
    editorial: path.join(root, 'content/editorial'),
    docs: defaultVersionDir(path.join(root, 'content/glaux')),
    publicDir: path.join(root, 'public'),
    drafts: development,
  });
  return {
    name: 'glaux-og-images',
    configResolved(config) {
      root = config.root;
      development = config.command === 'serve';
    },
    async generateBundle() {
      // The Worker never serves these, so they stay out of its bundle.
      if (this.environment.name !== 'client') return;
      const { collectOgEntries, createOgRenderer } = await load();
      const renderer = await createOgRenderer();
      const entries = collectOgEntries(sources());
      const started = performance.now();
      for (const entry of entries) {
        const { png, fit } = await renderer.render(entry);
        if (fit.truncated)
          this.warn(
            `OG card ${entry.lang}${entry.page || '/'}: the title (${entry.title.length} characters) does not fit at ${fit.titleSize}px and is cut with an ellipsis.`,
          );
        this.emitFile({ type: 'asset', fileName: ogImagePath(entry.lang, entry.page).slice(1), source: png });
      }
      this.info(`Drew ${entries.length} OG cards in ${Math.round(performance.now() - started)} ms.`);
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (!url.startsWith('/og/') || !url.endsWith('.png')) return next();
        try {
          const { collectOgEntries, createOgRenderer } = await load();
          const entry = collectOgEntries(sources()).find(
            (item) => ogImagePath(item.lang, item.page) === url,
          );
          if (!entry) return next();
          const { png } = await (await createOgRenderer()).render(entry);
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'no-store');
          res.end(png);
        } catch (error) {
          server.config.logger.error(String(error));
          res.statusCode = 500;
          res.end();
        }
      });
    },
  };
}
