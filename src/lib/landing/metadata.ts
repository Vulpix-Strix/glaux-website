import { absoluteUrl } from '../site.ts';
import { landingLanguages, type LandingLanguage } from '../i18n.ts';
import { landingCopy } from './copy.ts';

export function landingHead(lang: LandingLanguage) {
  const copy = landingCopy[lang];
  return {
    meta: [
      { title: copy.title },
      { name: 'description', content: copy.description },
      { property: 'og:title', content: copy.title },
      { property: 'og:description', content: copy.description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: absoluteUrl(`/${lang}`) },
      { property: 'og:locale', content: lang === 'es' ? 'es_ES' : 'en_US' },
      { name: 'twitter:card', content: 'summary' },
    ],
    links: [
      { rel: 'canonical', href: absoluteUrl(`/${lang}`) },
      ...landingLanguages.map((language) => ({
        rel: 'alternate', hrefLang: language, href: absoluteUrl(`/${language}`),
      })),
      { rel: 'alternate', hrefLang: 'x-default', href: absoluteUrl('/en') },
    ],
  };
}
