import type { Catalog } from '../glaux/catalog.ts';
import catalogJson from '../../../content/glaux/versions.json';

/** The versions `pnpm docs:sync` found, read at build time. */
export const catalog = catalogJson as Catalog;

/**
 * The version search covers on the page at `pathname`: the one of a manual page, else the
 * recommended one.
 */
export function searchVersion(pathname: string): string {
  const [, section, version] = pathname.split('/').filter(Boolean);
  return section === 'docs' && catalog.versions.some((v) => v.id === version) ? version : catalog.default;
}
