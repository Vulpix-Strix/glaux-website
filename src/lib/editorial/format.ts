import type { Locale } from '../../paraglide/runtime.js';

// BCP 47 tags for `Intl`; the site locales themselves are Paraglide's.
export const intlLocales = { en: 'en-US', es: 'es-CL' } satisfies Record<Locale, string>;

export const formatArticleDate = (date: string, lang: Locale) =>
  new Intl.DateTimeFormat(intlLocales[lang], { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${date}T12:00:00Z`),
  );
