import { createFileRoute, notFound } from '@tanstack/react-router';
import { articles } from 'virtual:editorial';
import { rssFeed } from '@/lib/editorial/catalog';
import { isLocale } from '@/paraglide/runtime';
import { siteUrl } from '@/lib/site';
export const Route = createFileRoute('/$lang/blog/rss.xml')({
  server: {
    handlers: {
      GET: ({ params }) => {
        if (!isLocale(params.lang)) throw notFound();
        return new Response(rssFeed(articles, params.lang, 'blog', siteUrl), {
          headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
          },
        });
      },
    },
  },
});
