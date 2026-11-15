import { readFileSync } from 'node:fs';
import path from 'node:path';
import { buildGlauxFiles, readGlauxFiles } from './glaux.ts';
import type { GlauxSource } from './glaux.ts';
import { REFERENCE, buildNpm, parseOverrides, readComponents, readLockfile, readPnpm } from './npm.ts';

/**
 * Where the generated credit data lives. It is served as it is, so a page never builds it. The
 * npm files are committed; the Glaux files are written by every build from the version it shows.
 */
export const OUT_DIR = 'public/credits';
/** Hand-written overrides for npm packages that ship no license text, and the texts themselves. */
export const OVERRIDES_FILE = 'credits/overrides.json';
export const OVERRIDES_TEXTS = 'credits/texts';

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/** The npm files, by name below {@link OUT_DIR}. Reads pnpm and the installed packages. */
export function generateNpm(root: string): Record<string, string> {
  const pnpm = readPnpm(root);
  const overrides = parseOverrides(readFileSync(path.join(root, OVERRIDES_FILE), 'utf8'));
  const npm = buildNpm(
    readComponents(pnpm.sbom, pnpm.licenses),
    readLockfile(pnpm.lockfile),
    overrides,
    (file) => readFileSync(path.join(root, OVERRIDES_TEXTS, file), 'utf8'),
  );
  return {
    'npm.json': json({ platform: `${REFERENCE.os}-${REFERENCE.cpu}-${REFERENCE.libc}`, entries: npm.entries, omitted: npm.omitted }),
    'npm-texts.json': json({ texts: npm.texts }),
  };
}

/** The Glaux files, by name below {@link OUT_DIR}, from a checkout of its credit files. */
export function generateGlaux(glauxDir: string, source: GlauxSource): Record<string, string> {
  const glaux = buildGlauxFiles(readGlauxFiles(glauxDir), source);
  return Object.fromEntries(Object.entries(glaux).map(([name, value]) => [name, json(value)]));
}
