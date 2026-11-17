import { compile } from '@mdx-js/mdx';
import { applyMdxPreset } from 'fumadocs-mdx/config';
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { glauxCodeOptions } from '../glaux/mdx-options.ts';
import { assetRange } from './asset-range.ts';
import { remarkAssetSize } from './remark-asset-size.ts';
import path from 'node:path';
import type { Plugin } from 'vite';
import {
  loadContent,
  resolveContentAssets,
  type ContentAsset,
  type ContentEntry,
} from './content.ts';

const catalogId = 'virtual:editorial';
const bodyPrefix = 'virtual:editorial-body/';
const mimeTypes: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.vtt': 'text/vtt',
  '.txt': 'text/plain',
};
export function editorialPlugin(contentRoot = path.resolve('content/editorial')): Plugin {
  let entries: ContentEntry[] = [];
  const assets = new Map<string, ContentAsset>();
  const root = contentRoot;
  let development = false;
  function refresh() {
    assets.clear();
    entries = loadContent(root, development).map((entry) =>
      resolveContentAssets(entry, root, assets),
    );
  }
  return {
    name: 'glaux-editorial',
    enforce: 'pre',
    configResolved(config) {
      development = config.command === 'serve';
      refresh();
    },
    resolveId(id) {
      if (id === catalogId || id.startsWith(bodyPrefix)) return `\0${id}`;
    },
    async load(id) {
      if (id === `\0${catalogId}`) {
        for (const entry of entries) this.addWatchFile(entry.file);
        for (const asset of assets.values()) this.addWatchFile(asset.file);
        const modules = entries.map(
          (entry) =>
            `${JSON.stringify(`${entry.article.lang}/${entry.article.section}/${entry.article.slug}`)}: () => import(${JSON.stringify(bodyPrefix + path.relative(root, entry.file) + '.js')})`,
        );
        return `export const articles = ${JSON.stringify(entries.map((entry) => entry.article))};\nexport const articleModules = {${modules.join(',')}};`;
      }
      if (!id.startsWith(`\0${bodyPrefix}`)) return;
      const entry = entries.find(
        (item) => bodyPrefix + path.relative(root, item.file) + '.js' === id.slice(1),
      );
      if (!entry) throw new Error('Unknown or unpublished editorial module');
      const options = await applyMdxPreset({
        remarkImageOptions: false,
        rehypeCodeOptions: glauxCodeOptions,
        remarkHeadingOptions: { generateToc: true },
        remarkNpmOptions: false,
      })('bundler');
      return String(
        await compile(
          { path: entry.file, value: entry.body },
          { ...options, remarkPlugins: [...(options.remarkPlugins ?? []), [remarkAssetSize, assets]] },
        ),
      );
    },
    generateBundle() {
      for (const asset of assets.values())
        this.emitFile({
          type: 'asset',
          fileName: asset.url.slice(1),
          source: readFileSync(asset.file),
        });
    },
    configureServer(server) {
      server.watcher.add(root);
      server.watcher.on('all', (_event, file) => {
        if (!file.startsWith(root)) return;
        try {
          refresh();
          // Only the virtual modules depend on the content. Invalidating the whole graph also evicts
          // React from the SSR runner while pre-bundled dependencies keep their copy, which leaves two
          // React instances and breaks hooks ("Invalid hook call").
          for (const environment of Object.values(server.environments))
            for (const [id, module] of environment.moduleGraph.idToModuleMap)
              if (id.startsWith('\0virtual:editorial')) environment.moduleGraph.invalidateModule(module);
          server.ws.send({ type: 'full-reload' });
        } catch (error) {
          server.config.logger.error(String(error));
        }
      });
      server.middlewares.use((req, res, next) => {
        const asset = assets.get((req.url ?? '').split('?')[0]);
        if (!asset) return next();
        res.setHeader(
          'Content-Type',
          mimeTypes[path.extname(asset.file)] ?? 'application/octet-stream',
        );
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Accept-Ranges', 'bytes');
        const size = statSync(asset.file).size;
        try {
          const range = assetRange(req.headers.range, size);
          if (range) {
            res.statusCode = 206;
            res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
          }
          res.setHeader('Content-Length', range ? range.end - range.start + 1 : size);
          if (req.method === 'HEAD') res.end();
          else createReadStream(asset.file, range).pipe(res);
        } catch {
          res.statusCode = 416;
          res.setHeader('Content-Range', `bytes */${size}`);
          res.end();
        }
      });
    },
  };
}
