import type { LicenseEntry } from './glaux.ts';
import type { NpmEntry } from './npm.ts';

export type CreditEntry = LicenseEntry | NpmEntry;

/** The groups the license filter offers. Ids are stable; the page translates their labels. */
export const licenseFamilies = ['mit', 'apache', 'mitApache', 'copyleft', 'other'] as const;
export type LicenseFamily = typeof licenseFamilies[number];
export type FamilyFilter = LicenseFamily | 'all';

/** Groups an SPDX expression. Any copyleft alternative wins, since it is what a reader would check first. */
export function licenseFamily(license: string): LicenseFamily {
  const choices = license.split(/\s+(?:OR|AND)\s+/).map((choice) => choice.trim());
  if (choices.some((choice) => /^[AL]?GPL|^MPL/.test(choice))) return 'copyleft';
  const mit = choices.includes('MIT');
  const apache = choices.some((choice) => choice.startsWith('Apache-2.0'));
  if (mit && apache) return 'mitApache';
  if (choices.length === 1 && mit) return 'mit';
  if (choices.length === 1 && apache) return 'apache';
  return 'other';
}

function matches(entry: CreditEntry, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const author = 'author' in entry ? entry.author ?? '' : '';
  return `${entry.name}\n${author}`.toLowerCase().includes(needle);
}

/** Entries whose name or author contains `query`, in a license family when one is chosen. */
export function filterEntries<T extends CreditEntry>(entries: readonly T[], query: string, family: FamilyFilter): T[] {
  return entries.filter((entry) => matches(entry, query) && (family === 'all' || licenseFamily(entry.license) === family));
}

/** How many entries of each family match `query`, so a chip never promises an empty list. */
export function familyCounts(entries: readonly CreditEntry[], query: string): Record<LicenseFamily, number> {
  const counts = Object.fromEntries(licenseFamilies.map((family) => [family, 0])) as Record<LicenseFamily, number>;
  for (const entry of entries) if (matches(entry, query)) counts[licenseFamily(entry.license)]++;
  return counts;
}
