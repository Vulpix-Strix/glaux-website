import { absoluteUrl } from '../site.ts';
import { landingLanguages, type LandingLanguage } from '../i18n.ts';
import { landingCopy } from './copy.ts';

/** Head tags of a page that exists in every landing language at `/{lang}{page}`; `page` is '' for the landing. */
export function pageHead(lang: LandingLanguage, page: string, { title, description }: { title: string; description: string }) {
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
      ...landingLanguages.map((language) => ({
        rel: 'alternate', hrefLang: language, href: absoluteUrl(`/${language}${page}`),
      })),
      { rel: 'alternate', hrefLang: 'x-default', href: absoluteUrl(`/en${page}`) },
    ],
  };
}

export const landingHead = (lang: LandingLanguage) => pageHead(lang, '', landingCopy[lang]);
