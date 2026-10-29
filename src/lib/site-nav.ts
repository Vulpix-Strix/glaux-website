import { repositoryUrl } from '@/lib/landing/navigation';

export { repositoryUrl };

export const downloadUrl = '/en#download';

export type SiteLink =
  | { id: string; label: string; href: string }
  // Destinations that do not exist yet. They are shown, but never linked.
  | { id: string; label: string; href?: undefined; planned: true };

export const siteLinks: readonly SiteLink[] = [
  { id: 'docs', label: 'Docs', href: '/en/docs/guide' },
  { id: 'learn', label: 'Learn', href: '/en#learn' },
  { id: 'games', label: 'Games', href: '/en#games' },
  { id: 'news', label: 'News', href: '/en/news' },
  { id: 'blog', label: 'Blog', href: '/en/blog' },
  { id: 'changelog', label: 'Changelog', planned: true },
];
