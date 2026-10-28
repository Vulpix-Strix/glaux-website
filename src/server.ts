import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';
import { isMarkdownPreferred } from 'fumadocs-core/negotiation';
import { isPublishedLanguage } from './lib/i18n';

const handleRequest = createStartHandler(defaultStreamHandler);

interface WorkerEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const [lang, section] = new URL(request.url).pathname.split('/').filter(Boolean);
    // Documentation URLs have both HTML and Markdown representations. Run the Worker
    // first, then use prerendered HTML when available; Markdown goes through Start.
    if ((request.method === 'GET' || request.method === 'HEAD') &&
      isPublishedLanguage(lang) && section === 'docs' && !isMarkdownPreferred(request)) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) {
        const response = new Response(asset.body, asset);
        response.headers.append('Vary', 'Accept');
        return response;
      }
    }
    return handleRequest(request);
  },
};
