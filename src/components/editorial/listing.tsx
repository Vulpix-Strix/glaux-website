import { Link } from '@tanstack/react-router';
import { articles } from 'virtual:editorial';
import type { Locale } from '@/paraglide/runtime';
import {
  articleUrl,
  categories,
  type Category,
  type EditorialSection,
} from '@/lib/editorial/model';
import {
  articlesFor,
  queryArticles,
  validateArticleSearch,
  type ArticleSearch,
} from '@/lib/editorial/catalog';
import { Container, Eyebrow, SurfaceCard, buttonClasses } from '@/components/site/primitives';
import { ArticleCard } from './cards';
import { ListingSidebar, NewsExtras } from './listing-extras';
import { EditorialShell } from './shell';
import { m } from '@/paraglide/messages';

export function EditorialListing({
  lang,
  section,
  search,
}: {
  lang: Locale;
  section: EditorialSection;
  search: ArticleSearch;
}) {
  const published = articlesFor(articles, lang, section);
  const result = queryArticles(published, search);
  const filtered = Boolean(search.q || search.category || search.page > 1);
  const featured = !filtered
    ? (published.find((article) => article.featured) ?? published[0])
    : undefined;
  const recent =
    section === 'blog' && !filtered
      ? published.filter((article) => article !== featured).slice(0, 3)
      : [];
  const visible = result.items.filter(
    (article) => article !== featured && !recent.includes(article),
  );
  const drafts = import.meta.env.DEV
    ? articles.filter(
        (article) =>
          article.lang === lang && article.section === section && article.status === 'draft',
      )
    : [];
  const topics = categories.filter((category) =>
    published.some((article) => article.categories.includes(category)),
  );
  const filters: Array<Category | ''> = ['', ...topics];
  return (
    <EditorialShell lang={lang} page={`/${section}`}>
      <main id="main" tabIndex={-1}>
        <Container className="pt-12 pb-16 sm:pt-16 sm:pb-24">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-8">
            <div className="max-w-reading">
              {section === 'blog' && <Eyebrow>{m.editorial_eyebrow()}</Eyebrow>}
              <h1 className="mb-4 text-5xl font-bold tracking-tight sm:text-6xl">
                {m[`editorial_${section}`]()}
              </h1>
              <p className="max-w-[55ch] text-lg leading-8 text-gx-muted">
                {section === 'news' ? m.editorial_news_lead() : m.editorial_blog_lead()}
              </p>
            </div>
            <form className="w-full max-w-sm" role="search">
              <label className="mb-2 block text-sm font-semibold" htmlFor="article-search">
                {m.editorial_search()}
              </label>
              <div className="flex gap-2">
                <input
                  id="article-search"
                  name="q"
                  type="search"
                  defaultValue={search.q}
                  className="min-h-11 min-w-0 flex-1 rounded-gx border border-gx-border-strong bg-gx-surface px-3"
                />
                {search.category && <input type="hidden" name="category" value={search.category} />}
                <button className={buttonClasses} type="submit">
                  {m.editorial_search()}
                </button>
              </div>
            </form>
          </div>
          {topics.length > 0 && (
            <nav aria-label={m.editorial_categories()} className="mb-10 flex flex-wrap gap-2">
              {filters.map((category) => (
                <Link
                  key={category}
                  to={section === 'news' ? '/$lang/news' : '/$lang/blog'}
                  params={{ lang }}
                  search={validateArticleSearch({ q: search.q, category, page: 1 })}
                  aria-current={search.category === category ? 'page' : undefined}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-gx-border-strong px-4 text-sm font-semibold hover:bg-gx-hover aria-current:border-gx-accent aria-current:bg-gx-accent-subtle"
                >
                  {category ? m[`editorial_topics_${category}`]() : m.editorial_all()}
                  <span className="text-gx-muted">
                    {category
                      ? published.filter((article) =>
                          article.categories.some((topic) => topic === category),
                        ).length
                      : published.length}
                  </span>
                </Link>
              ))}
            </nav>
          )}
          {featured && (
            <div className="mb-16">
              <ArticleCard article={featured} featured />
            </div>
          )}
          {recent.length > 0 && (
            <section className="mb-16" aria-labelledby="recent-title">
              <h2 id="recent-title" className="mb-6 text-2xl font-bold">
                {m.editorial_recent()}
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                {recent.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </section>
          )}
          {!published.length ? (
            <SurfaceCard className="border-dashed p-8 sm:p-12">
              <h2 className="text-2xl font-semibold">{m.editorial_empty()}</h2>
              <p className="mt-3 text-gx-muted">{m.editorial_empty_text()}</p>
            </SurfaceCard>
          ) : !result.total ? (
            <p role="status" className="py-12 text-gx-muted">
              {m.editorial_no_results()}
            </p>
          ) : (
            <div
              className={section === 'blog' ? 'grid gap-12 lg:grid-cols-[minmax(0,1fr)_240px]' : ''}
            >
              <section aria-labelledby="archive-title">
                <h2 id="archive-title" className="mb-6 text-2xl font-bold">
                  {section === 'blog' || filtered ? m.editorial_archive() : m.editorial_latest()}
                </h2>
                <div className={section === 'news' ? 'grid gap-4 md:grid-cols-12' : 'grid gap-5'}>
                  {visible.map((article, index) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      className={section === 'news' ? newsSpan(index) : ''}
                      compact={section === 'blog'}
                    />
                  ))}
                </div>
              </section>
              {section === 'blog' && <ListingSidebar articles={published} />}
            </div>
          )}
          {result.pages > 1 && (
            <nav
              aria-label={m.editorial_archive()}
              className="mt-10 flex flex-wrap items-center justify-center gap-3"
            >
              {Array.from({ length: result.pages }, (_, i) => i + 1).map((page) => (
                <Link
                  key={page}
                  to={section === 'news' ? '/$lang/news' : '/$lang/blog'}
                  params={{ lang }}
                  search={validateArticleSearch({ ...search, page })}
                  aria-current={page === result.page ? 'page' : undefined}
                  className="inline-grid size-11 place-items-center rounded-gx border border-gx-border aria-current:bg-gx-accent aria-current:text-gx-on-accent"
                >
                  {page}
                </Link>
              ))}
            </nav>
          )}
          {section === 'news' && !filtered && <NewsExtras articles={published} />}
          <div className="mt-12 flex flex-wrap gap-5 text-sm font-semibold text-gx-accent">
            <a href={`/${lang}/${section}/rss.xml`}>{m.editorial_feed()}</a>
            <a href={`/${lang}/${section === 'blog' ? 'news' : 'blog'}`}>
              {section === 'blog' ? m.editorial_news() : m.editorial_blog()}
            </a>
            <a href="/en/docs/guide" hrefLang="en">
              Docs
            </a>
          </div>
          {drafts.length > 0 && (
            <aside className="mt-10 rounded-lg border border-dashed border-gx-warning p-5">
              <p className="text-sm text-gx-muted">{m.editorial_draft()}</p>
              <ul className="mt-3 space-y-2">
                {drafts.map((article) => (
                  <li key={article.id}>
                    <a className="text-gx-accent underline" href={articleUrl(article)}>
                      {article.title}
                    </a>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </Container>
      </main>
    </EditorialShell>
  );
}
function newsSpan(index: number) {
  if (index % 5 === 0) return 'md:col-span-7';
  if (index % 5 === 1) return 'md:col-span-5';
  return 'md:col-span-4';
}
