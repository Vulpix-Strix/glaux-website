import { container } from 'takumi-js/helpers';
import { measure } from 'takumi-js';
import type { Renderer } from 'takumi-js/node';
import { titleNode, titleSlot } from './card.ts';
import { ogHeight, ogWidth, type OgEntry } from './model.ts';
import { minTitleSize } from './theme.ts';

export interface TitleFit {
  /** The composition to draw: the card keeps its cover only when the title fits beside it. */
  withCover: boolean;
  titleSize: number;
  lines: number;
  /** Nothing fit, so the card will cut the title with an ellipsis. The build reports it. */
  truncated: boolean;
}

// With a cover the title shares the card with a 520 px screenshot; below this it is not worth it.
const minSizeWithCover = 40;
const step = 2;

async function lineCount(renderer: Renderer, entry: OgEntry, size: number, width: number) {
  // The title is measured unclamped, so a title that does not fit shows up as too many lines.
  const probe = container({
    style: { display: 'flex', width },
    children: [titleNode(entry, size, 99)],
  });
  const [title] = (await measure(probe, { renderer, width: ogWidth, height: ogHeight })).children;
  return { lines: new Set(title.runs.map((run) => Math.round(run.y))).size, height: title.height };
}

/**
 * Picks the largest title size that fits its slot, lowering it a step at a time before touching
 * the composition, and the composition before truncating.
 */
export async function fitTitle(renderer: Renderer, entry: OgEntry): Promise<TitleFit> {
  const compositions = entry.cover ? [true, false] : [false];
  let last: TitleFit | undefined;
  for (const withCover of compositions) {
    const slot = titleSlot(entry, withCover);
    const start = slot.tiers.find(([longest]) => entry.title.length <= longest)![1];
    const floor = withCover ? minSizeWithCover : minTitleSize;
    for (let size = start; size >= floor; size -= step) {
      const { lines, height } = await lineCount(renderer, entry, size, slot.width);
      last = { withCover, titleSize: size, lines, truncated: false };
      if (lines <= slot.maxLines && height <= slot.height) return last;
    }
  }
  return { ...last!, truncated: true };
}
