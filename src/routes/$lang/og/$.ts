import { createFileRoute } from '@tanstack/react-router';
import { generateOGImage } from 'fumadocs-ui/og/takumi';
import { source } from '@/lib/docs/source';
import { appName } from '@/lib/site';

import { isPublishedLanguage } from '@/lib/i18n';

export const Route = createFileRoute('/$lang/og/$')({
  server: {
    handlers: {
      GET: ({ params }) => {
        if (!isPublishedLanguage(params.lang)) return new Response(null, { status: 404 });
        const slugs = (params._splat?.split('/') ?? []).filter((v) => v.length > 0).slice(0, -1);
        const page = source.getPage(slugs, params.lang);
        if (!page) return new Response(undefined, { status: 404 });

        return generateOGImage({
          title: page.data.title,
          description: page.data.description,
          site: appName,
          format: 'webp',
        });
      },
    },
  },
});
