import { articleUrl, type Article, type EditorialSection } from './model.ts';
import type { Locale } from '../../paraglide/runtime.js';

export function articlesFor(articles: Article[], lang: Locale, section: EditorialSection) {
  return articles
    .filter(
      (article) =>
        article.lang === lang && article.section === section && article.status === 'published',
    )
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.slug.localeCompare(b.slug));
}
export interface ArticleSearch {
  q: string;
  category: string;
  page: number;
}
export function parseArticleSearch(input: Record<string, unknown>): ArticleSearch {
  const page = Number(input.page);
  return {
    q: typeof input.q === 'string' ? input.q.slice(0, 200) : '',
    category: typeof input.category === 'string' ? input.category : '',
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}
export function validateArticleSearch(input: Record<string, unknown>): Partial<ArticleSearch> {
  const parsed = parseArticleSearch(input);
  return {
    ...(parsed.q ? { q: parsed.q } : {}),
    ...(parsed.category ? { category: parsed.category } : {}),
    ...(parsed.page > 1 ? { page: parsed.page } : {}),
  };
}

export function queryArticles(articles: Article[], search: ArticleSearch, pageSize = 10) {
  const query = search.q.trim().toLocaleLowerCase();
  const matching = articles.filter(
    (article) =>
      (!search.category || article.categories.some((category) => category === search.category)) &&
      (!query ||
        `${article.title} ${article.description} ${article.searchText}`
          .toLocaleLowerCase()
          .includes(query)),
  );
  const pages = Math.max(1, Math.ceil(matching.length / pageSize));
  const page = Math.min(search.page, pages);
  return {
    items: matching.slice((page - 1) * pageSize, page * pageSize),
    total: matching.length,
    pages,
    page,
  };
}
export function articleTranslations(articles: Article[], article: Article) {
  return articles.filter(
    (item) =>
      item.id === article.id && item.section === article.section && item.status === article.status,
  );
}
export function articleNeighbors(articles: Article[], article: Article) {
  const published = articlesFor(articles, article.lang, article.section);
  const index = published.findIndex((item) => item.slug === article.slug);
  return {
    newer: index > 0 ? published[index - 1] : undefined,
    older: index >= 0 ? published[index + 1] : undefined,
  };
}
export function relatedArticles(articles: Article[], article: Article) {
  return articlesFor(articles, article.lang, article.section)
    .filter(
      (item) =>
        item.id !== article.id &&
        item.categories.some((category) => article.categories.includes(category)),
    )
    .slice(0, 3);
}
export function seriesArticles(articles: Article[], article: Article) {
  if (!article.series) return [];
  return articles
    .filter(
      (item) =>
        item.lang === article.lang &&
        item.section === article.section &&
        item.status === article.status &&
        item.series?.id === article.series?.id,
    )
    .sort((a, b) => a.series!.part - b.series!.part);
}
const escapeXml = (text: string) =>
  text.replace(
    /[<>&"']/g,
    (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!,
  );
export function rssFeed(
  articles: Article[],
  lang: Locale,
  section: EditorialSection,
  origin: string,
) {
  const url = `${origin}/${lang}/${section}`;
  const items = articlesFor(articles, lang, section)
    .map(
      (article) =>
        `<item><title>${escapeXml(article.title)}</title><description>${escapeXml(article.description)}</description><link>${origin}${articleUrl(article)}</link><guid>${origin}${articleUrl(article)}</guid><pubDate>${new Date(`${article.date}T12:00:00Z`).toUTCString()}</pubDate></item>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Glaux ${section === 'blog' ? 'Blog' : 'News'}</title><link>${url}</link><description>Glaux ${section}</description><language>${lang}</language>${items}</channel></rss>`;
}
