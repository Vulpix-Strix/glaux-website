import { notFound } from '@tanstack/react-router';
import { articles, articleModules } from 'virtual:editorial';
import type { Article, EditorialSection } from './model';
const pending = new Map<string, ReturnType<(typeof articleModules)[string]>>();
export function loadArticleBody(article: Article) {
  const key = `${article.lang}/${article.section}/${article.slug}`;
  let result = pending.get(key);
  if (!result) {
    result = articleModules[key]();
    pending.set(key, result);
  }
  return result;
}
export function articleLoader(section: EditorialSection) {
  return async ({ params }: { params: { lang: string; slug: string } }) => {
    const article = articles.find(
      (item) => item.lang === params.lang && item.section === section && item.slug === params.slug,
    );
    if (!article || (!import.meta.env.DEV && article.status !== 'published')) throw notFound();
    await loadArticleBody(article);
    return { article };
  };
}
