// Build-time only: reads the content tree and the compiled Paraglide messages.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { m } from '../../paraglide/messages.js';
import { locales, isLocale, type Locale } from '../../paraglide/runtime.js';
import {
  loadContent,
  resolveContentAssets,
  type ContentAsset,
} from '../editorial/content.ts';
import { formatArticleDate } from '../editorial/format.ts';
import { sections, type Category } from '../editorial/model.ts';
import { docSlugs } from '../glaux/links.ts';
import { syncedPages } from '../glaux/versions.ts';
import { isPublishedLanguage } from '../i18n.ts';
import type { OgEntry, OgHue } from './model.ts';

export interface OgSources {
  /** `content/editorial`. */
  editorial: string;
  /** The synced documentation of every version, `content/glaux`. */
  docs: string;
  /** `public/`, for the screenshot of the landing. */
  publicDir: string;
  /** Include drafts. Only the dev server sets it, so no production build can. */
  drafts?: boolean;
}

const categoryHues: Record<Category, OgHue> = {
  announcements: 'gold',
  development: 'cyan',
  community: 'pink',
  showcases: 'orange',
  devlog: 'lime',
  technical: 'violet',
  design: 'pink',
  lessons: 'orange',
};

/** `~/noticias`, `~/devlog`: the section name as the interface calls it, in terminal form. */
const terminalPath = (name: string, lang: Locale, ...rest: string[]) =>
  ['~', name.toLocaleLowerCase(lang), ...rest].join('/');

const firstSentence = (text: string) => text.split(/(?<=[.!?])\s/)[0];

function landingEntries(sources: OgSources): OgEntry[] {
  return locales.map((lang) => ({
    lang,
    page: '',
    kind: 'landing',
    path: m.landing_hero_eyebrow({}, { locale: lang }).toLocaleUpperCase(lang),
    title: m.landing_hero_title({}, { locale: lang }),
    subtitle: firstSentence(m.landing_description({}, { locale: lang })),
    cover: {
      file: path.join(sources.publicDir, 'images/landing/signal-lost-gameplay.png'),
      alt: m.landing_alt_gameplay({}, { locale: lang }),
    },
  }));
}

/** Credits uses the landing template: it is a page of the site itself, not a section. */
function creditsEntries(): OgEntry[] {
  return locales.map((lang) => ({
    lang,
    page: '/credits',
    kind: 'landing',
    path: terminalPath(m.credits_hero_title({}, { locale: lang }), lang),
    title: m.credits_hero_title({}, { locale: lang }),
    subtitle: firstSentence(m.credits_description({}, { locale: lang })),
  }));
}

function sectionEntries(): OgEntry[] {
  return locales.flatMap((lang) =>
    sections.map((section) => ({
      lang,
      page: `/${section}`,
      kind: section,
      path: terminalPath(m[`editorial_${section}`]({}, { locale: lang }), lang),
      title: m[`editorial_${section}`]({}, { locale: lang }),
      subtitle: m[`editorial_${section}_lead`]({}, { locale: lang }),
    })),
  );
}

function articleEntries({ editorial, drafts }: OgSources): OgEntry[] {
  const assets = new Map<string, ContentAsset>();
  return loadContent(editorial, drafts === true)
    .map((entry) => resolveContentAssets(entry, editorial, assets))
    .map(({ article }): OgEntry => {
      const { lang } = article;
      const devlog = article.section === 'blog' ? article.number : undefined;
      const [category] = article.categories;
      const cover = article.cover && assets.get(article.cover.src);
      const meta = (readTime: string) =>
        [article.date && formatArticleDate(article.date, lang), readTime].filter(Boolean).join('  ·  ');
      return {
        lang,
        page: `/${article.section}/${article.slug}`,
        kind: article.section,
        path: devlog
          ? terminalPath(m.editorial_topics_devlog({}, { locale: lang }), lang)
          : terminalPath(m[`editorial_${article.section}`]({}, { locale: lang }), lang),
        title: article.title,
        devlog,
        category: {
          label: m[`editorial_topics_${category}`]({}, { locale: lang }),
          hue: categoryHues[category],
        },
        meta: {
          full: meta(`${article.minutes} ${m.editorial_minutes({}, { locale: lang })}`),
          compact: meta(`${article.minutes} min`),
        },
        ...(cover && article.cover ? { cover: { file: cover.file, alt: article.cover.alt } } : {}),
      };
    });
}

function docsEntries({ docs }: OgSources): OgEntry[] {
  if (!existsSync(docs)) return [];
  return syncedPages(docs).flatMap(({ version, lang, id, title, description }): OgEntry[] => {
    if (!isLocale(lang) || !isPublishedLanguage(lang)) return [];
    const slugs = docSlugs(id);
    return [
      {
        lang,
        page: ['/docs', version, ...slugs].join('/'),
        kind: 'docs',
        path: ['~', 'docs', version, ...slugs.slice(0, -1)].join('/'),
        title,
        ...(description ? { subtitle: firstSentence(description) } : {}),
      },
    ];
  });
}

/** Every card of the site, published pages only unless `drafts` is set. */
export function collectOgEntries(sources: OgSources): OgEntry[] {
  return [
    ...landingEntries(sources),
    ...creditsEntries(),
    ...sectionEntries(),
    ...articleEntries(sources),
    ...docsEntries(sources),
  ];
}
