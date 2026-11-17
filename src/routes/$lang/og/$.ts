import { createFileRoute } from '@tanstack/react-router';
import { generateOGImage } from 'fumadocs-ui/og/takumi';
import { getSource, isVersion } from '@/lib/docs/source';
import { appName } from '@/lib/site';

import { isPublishedLanguage } from '@/lib/i18n';

export const Route = createFileRoute('/$lang/og/$')({
  server: {
    handlers: {
      GET: ({ params }) => {
        if (!isPublishedLanguage(params.lang)) return new Response(null, { status: 404 });
        const [version, ...slugs] = (params._splat?.split('/') ?? []).filter((v) => v.length > 0).slice(0, -1);
        const page = isVersion(version) ? getSource(version).getPage(slugs, params.lang) : undefined;
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
