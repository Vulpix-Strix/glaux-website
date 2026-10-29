import { createFileRoute } from '@tanstack/react-router';
import { EditorialListing } from '@/components/editorial/listing';
import { parseArticleSearch, validateArticleSearch } from '@/lib/editorial/catalog';
import { isLocale } from '@/paraglide/runtime';
import { pageHead } from '@/lib/landing/metadata';
import { m } from '@/paraglide/messages';

export const Route = createFileRoute('/$lang/news/')({
  validateSearch: validateArticleSearch,
  head: ({ params }) => {
    const lang = isLocale(params.lang) ? params.lang : 'en';
    const head = pageHead(lang, '/news', {
      title: `${m.editorial_news({}, { locale: lang })} — Glaux`,
      description: m.editorial_news_lead({}, { locale: lang }),
    });
    return {
      ...head,
      links: [
        ...head.links,
        {
          rel: 'alternate',
          type: 'application/rss+xml',
          title: `Glaux ${m.editorial_news({}, { locale: lang })}`,
          href: `/${lang}/news/rss.xml`,
        },
      ],
    };
  },
  component: Page,
});
function Page() {
  const { lang } = Route.useParams();
  return (
    <EditorialListing
      lang={isLocale(lang) ? lang : 'en'}
      section="news"
      search={parseArticleSearch(Route.useSearch())}
    />
  );
}
