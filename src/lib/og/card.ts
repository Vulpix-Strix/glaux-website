import { container, image, text } from 'takumi-js/helpers';
import type { Declarations, Node } from 'takumi-js';
import { siteUrl } from '../site.ts';
import { ogHeight, ogWidth, type OgEntry } from './model.ts';
import { accents, colors, column, fonts, hues, layout, titleTiers, topBar } from './theme.ts';

type Tiers = readonly (readonly [number, number])[];

/** Where the title goes: how wide it can be, how many lines it may take and where its size starts. */
export interface TitleSlot {
  width: number;
  maxLines: number;
  /** Height left for the title once the other items of the body are placed. */
  height: number;
  tiers: Tiers;
}

const domain = new URL(siteUrl).host;
const isDevlog = (entry: OgEntry) => entry.devlog !== undefined;
const isApiName = (entry: OgEntry) => /^\/docs\/[^/]+\/api\//.test(entry.page) && /^[\w.:]+$/.test(entry.title);
// A devlog without a cover shows its number as a large numeral behind the title.
const hasNumeral = (entry: OgEntry, withCover: boolean) => isDevlog(entry) && !withCover;

const subtitleLines = 2;
const subtitleLine = 40;
const wordmarkHeight = 90;
const devlogLabelHeight = 36;

export function titleSlot(entry: OgEntry, withCover: boolean): TitleSlot {
  const landing = entry.kind === 'landing';
  const numeral = hasNumeral(entry, withCover);
  const items = [landing, isDevlog(entry), true, Boolean(entry.subtitle)].filter(Boolean).length;
  const taken =
    (landing ? wordmarkHeight : 0) +
    (isDevlog(entry) ? devlogLabelHeight : 0) +
    (entry.subtitle ? subtitleLines * subtitleLine : 0) +
    (items - 1) * layout.bodyGap;
  return {
    width: withCover ? column.withCover : numeral ? 700 : landing ? 920 : column.full,
    maxLines: landing ? 2 : withCover ? 5 : 4,
    height: column.body - taken,
    tiers: landing
      ? withCover ? titleTiers.landingCover : titleTiers.landing
      : withCover ? titleTiers.cover : numeral ? titleTiers.numeral : titleTiers.plain,
  };
}

const flex = (style: Declarations, children: Node[]) =>
  container({ style: { display: 'flex', ...style }, children });

export function titleNode(entry: OgEntry, size: number, maxLines: number): Node {
  const mono = isApiName(entry);
  return text(entry.title, {
    fontFamily: mono ? fonts.mono : fonts.sans,
    fontSize: size,
    lineHeight: `${Math.round(size * (mono ? 1.1 : 1.06))}px`,
    fontWeight: 700,
    letterSpacing: mono ? '0' : '-0.02em',
    color: colors.text,
    textWrap: 'balance',
    lineClamp: maxLines,
  });
}

const accentOf = (entry: OgEntry) => (isDevlog(entry) ? accents.devlog : accents[entry.kind]);

function topBarNode(): Node {
  return flex(
    { position: 'absolute', left: 0, top: 0, width: ogWidth, height: 8 },
    topBar.map(([background, width]) => container({ style: { width, height: 8, background } })),
  );
}

function header(entry: OgEntry): Node {
  const accent = accentOf(entry);
  return flex({ alignItems: 'center', gap: 18, height: layout.header, flexShrink: 0 }, [
    ...(entry.kind === 'landing'
      ? []
      : [text('glaux', { fontFamily: fonts.pixel, fontSize: 36, lineHeight: '36px', color: colors.text })]),
    text(entry.path, { fontFamily: fonts.pixel, fontSize: 27, lineHeight: '27px', color: accent, whiteSpace: 'nowrap' }),
    container({ style: { width: 14, height: 27, marginLeft: -12, background: accent } }),
  ]);
}

const wordmark = (): Node =>
  flex({ alignItems: 'flex-end', gap: 10 }, [
    text('glaux', { fontFamily: fonts.pixel, fontSize: wordmarkHeight, lineHeight: `${wordmarkHeight}px`, color: colors.text }),
    container({ style: { width: 40, height: 72, marginBottom: 6, background: colors.cyan } }),
  ]);

function footer(entry: OgEntry, withCover: boolean): Node {
  const chip = entry.category && hues[entry.category.hue];
  const showDomain = !withCover || entry.kind === 'landing';
  return flex({ alignItems: 'center', gap: 20, height: layout.footer, marginTop: layout.footerGap, flexShrink: 0 }, [
    ...(chip && entry.category
      ? [
          flex(
            { alignItems: 'center', height: layout.footer, padding: '0 16px', borderRadius: 2, background: chip.bg },
            [
              text(entry.category.label, {
                color: chip.fg,
                fontSize: 22,
                lineHeight: '22px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }),
            ],
          ),
        ]
      : []),
    ...(entry.meta
      ? [text(withCover ? entry.meta.compact : entry.meta.full, { fontSize: 24, lineHeight: '28px', color: colors.muted, whiteSpace: 'nowrap' })]
      : []),
    container({ style: { flexGrow: 1 } }),
    ...(showDomain
      ? [text(domain, { fontFamily: fonts.mono, fontSize: 22, lineHeight: '28px', color: colors.muted, whiteSpace: 'nowrap' })]
      : []),
  ]);
}

function coverFrame(file: Uint8Array): Node {
  const corner = (position: Declarations): Node =>
    container({ style: { position: 'absolute', width: 6, height: 6, background: colors.bg, ...position } });
  const [width, height] = layout.cover.inner;
  return flex(
    {
      position: 'relative',
      flexShrink: 0,
      alignSelf: 'center',
      width: layout.cover.frame,
      height: layout.cover.height,
      padding: 4,
      background: colors.borderStrong,
    },
    [
      image({ src: file, width, height, style: { width, height, objectFit: 'cover', imageRendering: 'pixelated' } }),
      corner({ left: 0, top: 0 }),
      corner({ right: 0, top: 0 }),
      corner({ left: 0, bottom: 0 }),
      corner({ right: 0, bottom: 0 }),
    ],
  );
}

export interface CardPlan {
  titleSize: number;
  /** Cover bytes when the card uses the composition with a screenshot. */
  cover?: Uint8Array;
}

export function buildCard(entry: OgEntry, { titleSize, cover }: CardPlan): Node {
  const withCover = cover !== undefined;
  const slot = titleSlot(entry, withCover);
  return flex(
    {
      position: 'relative',
      width: ogWidth,
      height: ogHeight,
      overflow: 'hidden',
      padding: `${layout.padding.top}px ${layout.padding.right}px ${layout.padding.bottom}px ${layout.padding.left}px`,
      gap: layout.gap,
      background: colors.bg,
      color: colors.text,
    },
    [
      topBarNode(),
      ...(hasNumeral(entry, withCover)
        ? [
            text(String(entry.devlog).padStart(2, '0'), {
              position: 'absolute',
              right: 40,
              top: 40,
              fontFamily: fonts.pixel,
              fontSize: 288,
              lineHeight: '288px',
              color: colors.numeral,
              whiteSpace: 'nowrap',
            }),
          ]
        : []),
      flex({ position: 'relative', flexDirection: 'column', flexGrow: 1, flexBasis: 0, minWidth: 0 }, [
        header(entry),
        flex({ flexDirection: 'column', justifyContent: 'flex-end', flexGrow: 1, flexBasis: 0, minHeight: 0, gap: layout.bodyGap }, [
          ...(entry.kind === 'landing' ? [wordmark()] : []),
          ...(isDevlog(entry)
            ? [text(`DEVLOG #${String(entry.devlog).padStart(2, '0')}`, { fontFamily: fonts.pixel, fontSize: 36, lineHeight: '36px', color: hues.lime.fg })]
            : []),
          container({ style: { display: 'flex', maxWidth: slot.width }, children: [titleNode(entry, titleSize, slot.maxLines)] }),
          ...(entry.subtitle
            ? [text(entry.subtitle, { maxWidth: 820, fontSize: 30, lineHeight: `${subtitleLine}px`, color: colors.muted, lineClamp: subtitleLines })]
            : []),
        ]),
        footer(entry, withCover),
      ]),
      ...(cover ? [coverFrame(cover)] : []),
    ],
  );
}
