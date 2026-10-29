import { ogHeight, ogWidth, type OgHue, type OgKind } from './model.ts';

// These mirror `src/styles/glaux-tokens.css`, which the renderer cannot read. The hues for
// chips pair a text color with a darker tint of it, as in the approved design.
export const colors = {
  bg: '#181215',
  text: '#dff6f5',
  muted: '#a0938e',
  raised: '#302c2e',
  border: '#473f40',
  borderStrong: '#7d7071',
  cyan: '#28ccdf',
  cyanText: '#8aebf1',
  numeral: '#3d3c26',
  code: '#cfc6b8',
} as const;

export const hues: Record<OgHue, { fg: string; bg: string }> = {
  cyan: { fg: '#8aebf1', bg: '#364043' },
  lime: { fg: '#b6d53c', bg: '#3d3c26' },
  gold: { fg: '#f4b41b', bg: '#473721' },
  orange: { fg: '#f79a5d', bg: '#47332b' },
  pink: { fg: '#ffaeb6', bg: '#49363a' },
  violet: { fg: '#cc9ae7', bg: '#413342' },
};

/** The accent of each template; a devlog overrides the blog one. */
export const accents: Record<OgKind | 'devlog', string> = {
  landing: '#28ccdf',
  news: '#f4b41b',
  blog: '#ffaeb6',
  devlog: '#b6d53c',
  docs: '#cc9ae7',
};

/** Widths in px of the multicolor bar. They add up to the card width. */
export const topBar = [
  ['#28ccdf', 240],
  ['#ffaeb6', 150],
  ['#f4b41b', 120],
  ['#302c2e', 270],
  ['#cc9ae7', 180],
  ['#71aa34', 120],
  ['#473f40', 120],
] as const;

export const fonts = { sans: 'Hanken Grotesk', mono: 'JetBrains Mono', pixel: 'Pixel Code' } as const;

export const layout = {
  padding: { top: 64, right: 64, bottom: 56, left: 64 },
  gap: 56,
  header: 36,
  footer: 44,
  footerGap: 40,
  bodyGap: 22,
  cover: { frame: 520, height: 488, inner: [512, 480] as const },
} as const;

const inner = {
  width: ogWidth - layout.padding.left - layout.padding.right,
  height: ogHeight - layout.padding.top - layout.padding.bottom,
};

/** Width of the text column, and the height left for the body between the header and the footer. */
export const column = {
  withCover: inner.width - layout.gap - layout.cover.frame,
  full: inner.width,
  body: inner.height - layout.header - layout.footer - layout.footerGap,
};

/** Title size by title length, from the approved design: `[longest title, px]`. */
export const titleTiers = {
  landingCover: [[20, 56], [40, 48], [Infinity, 42]],
  landing: [[24, 72], [48, 60], [Infinity, 50]],
  cover: [[20, 68], [40, 58], [64, 50], [Infinity, 44]],
  numeral: [[20, 84], [40, 70], [64, 60], [Infinity, 52]],
  plain: [[24, 96], [48, 80], [72, 68], [Infinity, 58]],
} as const satisfies Record<string, readonly (readonly [number, number])[]>;

/** Below this the title is no longer a title; past it the card truncates and the build says so. */
export const minTitleSize = 32;
