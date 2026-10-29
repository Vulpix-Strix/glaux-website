import type { LandingLanguage } from '../i18n.ts';

export const sections = ['news', 'blog'] as const;
export type EditorialSection = (typeof sections)[number];
export const categories = [
  'announcements',
  'development',
  'community',
  'showcases',
  'devlog',
  'technical',
  'design',
  'lessons',
] as const;
export type Category = (typeof categories)[number];
export interface EditorialImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
}
export interface Article {
  id: string;
  lang: LandingLanguage;
  section: EditorialSection;
  slug: string;
  title: string;
  description: string;
  date?: string;
  categories: Category[];
  status: 'draft' | 'published';
  author?: string;
  cover?: EditorialImage;
  featured?: boolean;
  number?: number;
  series?: { id: string; title: string; part: number };
  presentation?: 'story' | 'brief' | 'showcase' | 'event' | 'video';
  event?: { start: string; end: string; timeZone: string; location: string };
  notice?: string;
  words: number;
  minutes: number;
  searchText: string;
}
export const articleUrl = (article: Pick<Article, 'lang' | 'section' | 'slug'>) =>
  `/${article.lang}/${article.section}/${article.slug}`;
export const isEditorialSection = (value: string): value is EditorialSection =>
  sections.some((section) => section === value);
