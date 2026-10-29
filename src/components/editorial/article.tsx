import { InlineTOC } from 'fumadocs-ui/components/inline-toc';
import type { ComponentType } from 'react';
import type { MDXProps } from 'mdx/types';
import type { TOCItemType } from 'fumadocs-core/toc';
import { articles } from 'virtual:editorial';
import type { Article } from '@/lib/editorial/model';
import { articleUrl } from '@/lib/editorial/model';
import {
  articleNeighbors,
  articleTranslations,
  relatedArticles,
  seriesArticles,
} from '@/lib/editorial/catalog';
import { editorialCopy } from '@/lib/editorial/copy';
import { absoluteUrl } from '@/lib/site';
import { Container } from '@/components/site/primitives';
import { ArticleMeta, ArticleTags, ArticleCard } from './cards';
import { EditorialShell } from './shell';
import { editorialComponents } from './mdx';
import { EditorialNotice, ArticleFigure } from './blocks/content';
import { ReadingProgress, ShareArticle } from './reading';

export function EditorialArticle({
  article,
  body: Body,
  toc,
}: {
  article: Article;
  body: ComponentType<MDXProps>;
  toc: TOCItemType[];
}) {
  const copy = editorialCopy[article.lang];
  const translations = Object.fromEntries(
    articleTranslations(articles, article).map((item) => [
      item.lang,
      `/${item.section}/${item.slug}`,
    ]),
  );
  const related = relatedArticles(articles, article);
  const series = seriesArticles(articles, article);
  const neighbors = articleNeighbors(articles, article);
  return (
    <EditorialShell
      lang={article.lang}
      page={`/${article.section}/${article.slug}`}
      languagePaths={translations}
    >
      {article.status === 'draft' && <EditorialNotice>{copy.draft}</EditorialNotice>}
      {article.notice && <EditorialNotice>{article.notice}</EditorialNotice>}
      {article.section === 'blog' && <ReadingProgress title={article.title} />}
      <main id="main" tabIndex={-1}>
        <Container className="pt-10 pb-16 sm:pt-12 sm:pb-24">
          <header className="mb-10 flex flex-col items-start gap-6">
            <nav aria-label={copy.breadcrumb} className="text-sm text-gx-muted">
              <ol className="flex flex-wrap gap-2">
                <li>
                  <a href={`/${article.lang}/${article.section}`} className="text-gx-accent">
                    {copy[article.section]}
                  </a>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page">{article.title}</li>
              </ol>
            </nav>
            <ArticleTags article={article} />
            {(article.number || article.series) && (
              <p className="font-gx-pixel text-lg text-gx-muted">
                {article.number ? `#${article.number}` : ''}
                {article.series && ` · ${article.series.title}, ${article.series.part}`}
              </p>
            )}
            <h1 className="max-w-[22ch] text-4xl leading-tight font-bold tracking-tight text-balance sm:text-6xl">
              {article.title}
            </h1>
            <p className="max-w-[60ch] text-xl leading-9 text-gx-muted">{article.description}</p>
            <ArticleMeta article={article} showWords />
          </header>
          {article.cover && <ArticleFigure {...article.cover} />}
          <div className="mt-12 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="min-w-0">
              <article
                id="article-body"
                className="gx-editorial-prose prose max-w-reading text-gx-text"
              >
                <Body components={editorialComponents} />
              </article>
              <div className="mt-10 border-t border-gx-border pt-6">
                <ShareArticle title={article.title} url={absoluteUrl(articleUrl(article))} />
              </div>
            </div>
            <aside className="min-w-0 space-y-8 lg:sticky lg:top-16 max-lg:order-first">
              {toc.length > 0 && <InlineTOC items={toc}>{copy.toc}</InlineTOC>}
              {series.length > 0 && (
                <nav aria-label={copy.series}>
                  <h2 className="mb-3 font-semibold">{article.series?.title}</h2>
                  <ol className="space-y-3">
                    {series.map((item) => (
                      <li key={item.slug}>
                        <a
                          className="text-sm text-gx-accent hover:underline aria-current:font-bold"
                          aria-current={item.slug === article.slug ? 'page' : undefined}
                          href={articleUrl(item)}
                        >
                          {item.series?.part}. {item.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
            </aside>
          </div>
          {related.length > 0 && (
            <section className="mt-16">
              <h2 className="mb-6 text-2xl font-bold">{copy.related}</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {related.map((item) => (
                  <ArticleCard key={item.id} article={item} />
                ))}
              </div>
            </section>
          )}
          {(neighbors.newer || neighbors.older) && (
            <nav
              aria-label={copy.archive}
              className="mt-10 flex flex-wrap justify-between gap-5 border-t border-gx-border pt-6"
            >
              {neighbors.newer && (
                <a href={articleUrl(neighbors.newer)} className="text-gx-accent">
                  ← {copy.newer}: {neighbors.newer.title}
                </a>
              )}
              {neighbors.older && (
                <a href={articleUrl(neighbors.older)} className="text-gx-accent">
                  {copy.older}: {neighbors.older.title} →
                </a>
              )}
            </nav>
          )}
        </Container>
      </main>
    </EditorialShell>
  );
}
