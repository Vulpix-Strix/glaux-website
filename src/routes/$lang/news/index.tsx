import { createFileRoute } from '@tanstack/react-router';
import { EditorialListing } from '@/components/editorial/listing';
import { parseArticleSearch, validateArticleSearch } from '@/lib/editorial/catalog';
import { editorialCopy } from '@/lib/editorial/copy';
import { isLandingLanguage } from '@/lib/i18n';
import { pageHead } from '@/lib/landing/metadata';

export const Route = createFileRoute('/$lang/news/')({
  validateSearch: validateArticleSearch,
  head: ({ params }) => {
    const lang = isLandingLanguage(params.lang) ? params.lang : 'en';
    const copy = editorialCopy[lang];
    const head = pageHead(lang, '/news', {
      title: `${copy.news} — Glaux`,
      description: copy.newsLead,
    });
    return {
      ...head,
      links: [
        ...head.links,
        {
          rel: 'alternate',
          type: 'application/rss+xml',
          title: `Glaux ${copy.news}`,
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
      lang={isLandingLanguage(lang) ? lang : 'en'}
      section="news"
      search={parseArticleSearch(Route.useSearch())}
    />
  );
}
