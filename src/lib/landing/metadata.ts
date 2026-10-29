import { absoluteUrl } from '../site.ts';
import { locales, type Locale } from '../../paraglide/runtime.js';
import { m } from '../../paraglide/messages.js';

/** Head tags of a page that exists in every landing language at `/{lang}{page}`; `page` is '' for the landing. */
export function pageHead(lang: Locale, page: string, { title, description }: { title: string; description: string }) {
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: absoluteUrl(`/${lang}${page}`) },
      { property: 'og:locale', content: lang === 'es' ? 'es_ES' : 'en_US' },
      { name: 'twitter:card', content: 'summary' },
    ],
    links: [
      { rel: 'canonical', href: absoluteUrl(`/${lang}${page}`) },
      ...locales.map((language) => ({
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
