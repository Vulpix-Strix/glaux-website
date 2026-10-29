import { absoluteUrl } from '../site.ts';
import { locales, type Locale } from '@/paraglide/runtime';
import { m } from '../../paraglide/messages.js';
import { ogHeight, ogImagePath, ogWidth } from '../og/model.ts';

/**
 * Head tags of a page that exists in every landing language at `/{lang}{page}`; `page` is '' for the
 * landing. Pages published in fewer languages pass them as `languages`. The Open Graph card is the
 * one the build draws for the page, so `imageAlt` should describe what that card shows. A page can
 * replace it with `image`; the size tags are then only emitted when the size is known.
 */
export function pageHead(
  lang: Locale,
  page: string,
  {
    title,
    description,
    imageAlt = title,
    languages = locales,
    image,
  }: {
    title: string;
    description: string;
    imageAlt?: string;
    languages?: readonly Locale[];
    image?: { src: string; width?: number; height?: number };
  },
) {
  const imageUrl = absoluteUrl(image?.src ?? ogImagePath(lang, page));
  const width = image ? image.width : ogWidth;
  const height = image ? image.height : ogHeight;
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: absoluteUrl(`/${lang}${page}`) },
      { property: 'og:locale', content: lang === 'es' ? 'es_ES' : 'en_US' },
      { property: 'og:image', content: imageUrl },
      ...(width && height
        ? [
            { property: 'og:image:width', content: String(width) },
            { property: 'og:image:height', content: String(height) },
          ]
        : []),
      { property: 'og:image:alt', content: imageAlt },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: imageUrl },
      { name: 'twitter:image:alt', content: imageAlt },
    ],
    links: [
      { rel: 'canonical', href: absoluteUrl(`/${lang}${page}`) },
      ...languages.map((language) => ({
        rel: 'alternate', hrefLang: language, href: absoluteUrl(`/${language}${page}`),
      })),
      { rel: 'alternate', hrefLang: 'x-default', href: absoluteUrl(`/en${page}`) },
    ],
  };
}

export const landingHead = (lang: Locale) => pageHead(lang, '', {
    title: m.landing_title({}, { locale: lang }),
    description: m.landing_description({}, { locale: lang }),
  });
