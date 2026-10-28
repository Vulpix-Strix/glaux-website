import { createFileRoute } from '@tanstack/react-router';
import { docsLlms, source } from '@/lib/docs/source';
import { isPublishedLanguage } from '@/lib/i18n';
import { decodeMarkdownUrl } from '@/lib/docs/urls';

export const Route = createFileRoute('/$lang/docs/{$}.md')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!isPublishedLanguage(params.lang)) return new Response(null, { status: 404 });
        const slugs = decodeMarkdownUrl(params._splat?.split('/') ?? []);
        const page = source.getPage(slugs, params.lang);
        if (!page) return new Response(null, { status: 404 });

        return new Response(await docsLlms.page(page), {
          headers: {
            'Content-Type': 'text/markdown',
          },
        });
      },
    },
  },
});
