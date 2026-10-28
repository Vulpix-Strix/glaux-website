export const repositoryUrl = 'https://github.com/Vulpix-Strix/glaux';

export const landingNavigation = [
  { id: 'features', href: '#features' },
  { id: 'create', href: '#create' },
  { id: 'games', href: '#games' },
  { id: 'learn', href: '#learn' },
  { id: 'news', href: '#news' },
] as const;

// Only English documentation is published. Destinations are actual pages,
// including a representative page for categories without an index page.
export const documentationLinks = [
  { id: 'gettingStarted', slug: 'guide/getting-started' },
  { id: 'gameLoop', slug: 'guide/game-loop' },
  { id: 'api', slug: 'api' },
] as const;

export const apiLinks = [
  { id: 'lifecycle', slug: 'api/lifecycle/boot', tone: 'cyan' },
  { id: 'graphics', slug: 'api/graphics/cls', tone: 'pink' },
  { id: 'input', slug: 'api/input/btn', tone: 'lime' },
  { id: 'audio', slug: 'api/audio', tone: 'violet' },
  { id: 'time', slug: 'api/time/t', tone: 'orange' },
  { id: 'logging', slug: 'api/logging', tone: 'gold' },
  { id: 'modules', slug: 'api/modules/require', tone: 'cyan' },
] as const;
