import type { Locale } from '../../paraglide/runtime.js';

export const ogWidth = 1200;
export const ogHeight = 630;

export type OgKind = 'landing' | 'news' | 'blog' | 'docs';
export type OgHue = 'cyan' | 'lime' | 'gold' | 'orange' | 'pink' | 'violet';

/** Everything a card shows, already localized. Collected by `entries.ts`, drawn by `card.ts`. */
export interface OgEntry {
  lang: Locale;
  /** Path of the page below `/{lang}`: '' for the landing, '/news', '/blog/slug', '/docs/dev/api/btn'. */
  page: string;
  kind: OgKind;
  /** Terminal breadcrumb, such as `~/noticias`. */
  path: string;
  title: string;
  subtitle?: string;
  /** Devlog number; the card shows it as a label and, without a cover, as a large numeral. */
  devlog?: number;
  category?: { label: string; hue: OgHue };
  /** Date and reading time. The compact form is for the composition with a cover, which has less room. */
  meta?: { full: string; compact: string };
  /** Optional screenshot. Cards without one use the full-width composition. */
  cover?: { file: string; alt: string };
}

/** Public path of the card of the page at `/{lang}{page}`. Shared by the build and the page heads. */
export const ogImagePath = (lang: Locale, page: string) => `/og/${lang}${page || '/index'}.png`;
