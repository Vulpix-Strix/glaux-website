import { createFileRoute } from '@tanstack/react-router';
import { catalog, docsLlms, docsPages, getSource } from '@/lib/docs/source';
import { resolveDocsPath } from '@/lib/docs/versions';
import { isPublishedLanguage } from '@/lib/i18n';
import { decodeMarkdownUrl, getPageMarkdownUrl } from '@/lib/docs/urls';

export const Route = createFileRoute('/$lang/docs/{$}.md')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!isPublishedLanguage(params.lang)) return new Response(null, { status: 404 });
        const target = resolveDocsPath(catalog, decodeMarkdownUrl(params._splat?.split('/') ?? []), docsPages(params.lang));
        if (target.kind === 'not-found') return new Response(null, { status: 404 });
        if (target.kind === 'redirect') {
          const location = getPageMarkdownUrl({ slugs: target.segments, locale: params.lang }).url;
          return new Response(null, { status: 307, headers: { Location: location } });
        }
        const page = getSource(target.version).getPage(target.slugs, params.lang)!;

        return new Response(await docsLlms.page(page), {
          headers: {
            'Content-Type': 'text/markdown',
          },
        });
      },
    },
  },
});
