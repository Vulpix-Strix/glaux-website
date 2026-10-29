import type { LandingLanguage } from '@/lib/i18n';
import { articleUrl, type Article } from '@/lib/editorial/model';
import { editorialCopy } from '@/lib/editorial/copy';
import { ArticleCard } from './cards';

export function ListingSidebar({
  articles: published,
  lang,
}: {
  articles: Article[];
  lang: LandingLanguage;
}) {
  const copy = editorialCopy[lang];
  const series = [
    ...new Map(
      published
        .filter((article) => article.series)
        .map((article) => [article.series!.id, article.series!]),
    ).values(),
  ];
  return (
    <aside className="space-y-8">
      <h2 className="text-xl font-semibold">{copy.series}</h2>
      {series.map((item) => (
        <section key={item.id}>
          <h3 className="mb-3 font-semibold">{item.title}</h3>
          <ol className="space-y-3">
            {published
              .filter((article) => article.series?.id === item.id)
              .sort((a, b) => a.series!.part - b.series!.part)
              .map((article) => (
                <li key={article.id}>
                  <a className="text-sm text-gx-accent hover:underline" href={articleUrl(article)}>
                    {article.series!.part}. {article.title}
                  </a>
                </li>
              ))}
          </ol>
        </section>
      ))}
    </aside>
  );
}
export function NewsExtras({
  articles: published,
  lang,
}: {
  articles: Article[];
  lang: LandingLanguage;
}) {
  const copy = editorialCopy[lang];
  const showcases = published.filter((article) => article.presentation === 'showcase');
  const briefs = published.filter((article) => article.presentation === 'brief');
  return (
    <>
      {showcases.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">{copy.showcases}</h2>
          <div className="grid auto-cols-[minmax(240px,280px)] grid-flow-col gap-4 overflow-x-auto pb-4">
            {showcases.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      )}
      {briefs.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">{copy.briefs}</h2>
          {briefs.map((article) => (
            <div className="border-t border-gx-border py-4" key={article.id}>
              <a className="text-gx-accent hover:underline" href={articleUrl(article)}>
                {article.title}
              </a>
              <p className="text-gx-muted">{article.description}</p>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
