import { createFileRoute, notFound } from '@tanstack/react-router';
import { articles } from 'virtual:editorial';
import { rssFeed } from '@/lib/editorial/catalog';
import { isLandingLanguage } from '@/lib/i18n';
import { siteUrl } from '@/lib/site';
export const Route = createFileRoute('/$lang/news/rss.xml')({
  server: {
    handlers: {
      GET: ({ params }) => {
        if (!isLandingLanguage(params.lang)) throw notFound();
        return new Response(rssFeed(articles, params.lang, 'news', siteUrl), {
          headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
          },
        });
      },
    },
  },
});
