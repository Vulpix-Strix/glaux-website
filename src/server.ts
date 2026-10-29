import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';
import { isMarkdownPreferred } from 'fumadocs-core/negotiation';
import { paraglideMiddleware } from './paraglide/server.js';
import { isLocale } from './paraglide/runtime.js';
import { isPublishedLanguage } from './lib/i18n';

const handleRequest = createStartHandler(defaultStreamHandler);

interface WorkerEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    const [lang, section, ...slugs] = url.pathname.split('/').filter(Boolean);
    // Filtered listings need SSR for their query. Only canonical listings use static HTML.
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      isLocale(lang) &&
      (section === 'news' || section === 'blog') &&
      slugs.length === 0 &&
      !url.search
    ) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;
    }
    // Documentation URLs have both HTML and Markdown representations. Run the Worker
    // first, then use prerendered HTML when available; Markdown goes through Start.
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      isPublishedLanguage(lang) &&
      section === 'docs' &&
      !isMarkdownPreferred(request)
    ) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) {
        const response = new Response(asset.body, asset);
        response.headers.append('Vary', 'Accept');
        return response;
      }
    }
    // The router owns the `/en` and `/es` URLs, so Start gets the original request, not the
    // delocalized one the middleware offers. Paraglide only resolves the locale for this request.
    return paraglideMiddleware(request, () => handleRequest(request));
  },
};
