import { repositoryUrl } from '@/lib/landing/navigation';
import { m } from '@/paraglide/messages';

export { repositoryUrl };

export const downloadUrl = '/en#download';

export type SiteLink =
  | { id: string; label: () => string; href: string }
  // Destinations that do not exist yet. They are shown, but never linked.
  | { id: string; label: () => string; href?: undefined; planned: true };

export const siteLinks: readonly SiteLink[] = [
  { id: 'docs', label: m.docs_nav_docs, href: '/en/docs/guide' },
  { id: 'learn', label: m.landing_nav_learn, href: '/en#learn' },
  { id: 'games', label: m.landing_nav_games, href: '/en#games' },
  { id: 'news', label: m.editorial_news, href: '/en/news' },
  { id: 'blog', label: m.editorial_blog, href: '/en/blog' },
  { id: 'changelog', label: m.docs_nav_changelog, planned: true },
];
