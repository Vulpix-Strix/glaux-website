import type { Article } from './model.ts';
import { articleUrl } from './model.ts';
import { articleTranslations } from './catalog.ts';
import { pageHead } from '../landing/metadata.ts';
import { absoluteUrl } from '../site.ts';
import { ogImagePath } from '../og/model.ts';
export function articleHead(article: Article, articles: Article[]) {
  const head = pageHead(article.lang, `/${article.section}/${article.slug}`, {
    title: `${article.title} — Glaux`,
    description: article.description,
    imageAlt: article.cover?.alt,
  });
  const published = article.status === 'published';
  const translations = published
    ? articleTranslations(articles, article).filter((item) => item.status === 'published')
    : [];
  const jsonLd = published
    ? {
        '@context': 'https://schema.org',
        '@type': article.section === 'news' ? 'NewsArticle' : 'BlogPosting',
        headline: article.title,
        description: article.description,
        datePublished: article.date,
        url: absoluteUrl(articleUrl(article)),
        inLanguage: article.lang,
        ...(article.author ? { author: { '@type': 'Person', name: article.author } } : {}),
        image: absoluteUrl(ogImagePath(article.lang, `/${article.section}/${article.slug}`)),
      }
    : undefined;
  return {
    meta: [
      ...head.meta.filter((item) => !('property' in item && item.property === 'og:type')),
      { property: 'og:type', content: 'article' },
      ...(article.date ? [{ property: 'article:published_time', content: article.date }] : []),
      ...(!published ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),
    ],
    links: [
      { rel: 'canonical', href: absoluteUrl(articleUrl(article)) },
      ...translations.map((item) => ({
        rel: 'alternate',
        hrefLang: item.lang,
        href: absoluteUrl(articleUrl(item)),
      })),
      ...(translations.some((item) => item.lang === 'en')
        ? [
            {
              rel: 'alternate',
              hrefLang: 'x-default',
              href: absoluteUrl(articleUrl(translations.find((item) => item.lang === 'en')!)),
            },
          ]
        : []),
    ],
    scripts: jsonLd
      ? [{ type: 'application/ld+json', children: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }]
      : [],
  };
}
