import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { render } from 'takumi-js';
import { Renderer } from 'takumi-js/node';
import { buildCard } from './card.ts';
import { fitTitle, type TitleFit } from './fit.ts';
import { ogHeight, ogWidth, type OgEntry } from './model.ts';
import { fonts } from './theme.ts';

const require = createRequire(import.meta.url);
const fontFiles = [
  [fonts.sans, require.resolve('@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2')],
  [fonts.mono, require.resolve('@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2')],
  // The site serves this one from `public/`. Only the regular weight exists, and it is not faked bold.
  [fonts.pixel, path.resolve(import.meta.dirname, '../../../public/fonts/pixel-code-regular.woff2')],
] as const;

export interface OgImage {
  png: Uint8Array;
  fit: TitleFit;
}

export interface OgRenderer {
  render(entry: OgEntry): Promise<OgImage>;
}

/** Loads the fonts once; every card of a build goes through the same renderer. */
export async function createOgRenderer(): Promise<OgRenderer> {
  const renderer = new Renderer();
  for (const [name, file] of fontFiles) await renderer.registerFont({ name, data: readFileSync(file) });
  return {
    async render(entry) {
      const fit = await fitTitle(renderer, entry);
      const cover = fit.withCover && entry.cover ? readFileSync(entry.cover.file) : undefined;
      const card = buildCard(entry, { titleSize: fit.titleSize, cover });
      const png = await render(card, { renderer, width: ogWidth, height: ogHeight, format: 'png' });
      return { png, fit };
    },
  };
}
