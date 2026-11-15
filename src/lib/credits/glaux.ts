import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { git, localCommit } from '../glaux/checkout.ts';
import type { Revision } from '../glaux/checkout.ts';
import { parseEditorial } from './ron.ts';

/** The files of Glaux that hold its credits. They are read as they are and never edited. */
export const GLAUX_FILES = {
  editorial: 'rom/credits.ron',
  thirdParty: 'apps/glaux/licenses/third-party.json',
  extra: 'apps/glaux/licenses/extra.json',
} as const;

const TEXT_KINDS = ['license', 'template', 'notice'];

export interface LicenseText {
  kind: string;
  title: string;
  spdx?: string;
  content: string;
}

export interface LicenseEntry {
  name: string;
  version: string;
  license: string;
  repository?: string;
  category: string;
  text_ids: number[];
}

export interface Inventory {
  texts: LicenseText[];
  entries: LicenseEntry[];
}

const object = (value: unknown, where: string): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${where} must be an object`);
  return value as Record<string, unknown>;
};

const string = (value: unknown, where: string): string => {
  if (typeof value !== 'string') throw new Error(`${where} must be a string`);
  return value;
};

/** Reads one of Glaux's license files, which share one shape, and checks what the website relies on. */
export function parseInventory(json: string, where: string): Inventory {
  const data = object(JSON.parse(json), where);
  if (!Array.isArray(data.texts) || !Array.isArray(data.entries)) throw new Error(`${where} needs \`texts\` and \`entries\` lists`);

  const texts = data.texts.map((raw, index): LicenseText => {
    const text = object(raw, `${where}: texts[${index}]`);
    const kind = string(text.kind, `${where}: texts[${index}].kind`);
    if (!TEXT_KINDS.includes(kind)) throw new Error(`${where}: texts[${index}] has unknown kind \`${kind}\``);
    return {
      kind,
      title: string(text.title, `${where}: texts[${index}].title`),
      ...(text.spdx === undefined ? {} : { spdx: string(text.spdx, `${where}: texts[${index}].spdx`) }),
      content: string(text.content, `${where}: texts[${index}].content`),
    };
  });

  const entries = data.entries.map((raw, index): LicenseEntry => {
    const entry = object(raw, `${where}: entries[${index}]`);
    const ids = entry.text_ids;
    if (!Array.isArray(ids) || ids.some((id) => !Number.isInteger(id) || id < 0 || id >= texts.length)) {
      throw new Error(`${where}: entries[${index}] (${String(entry.name)}) points at a text that does not exist`);
    }
    return {
      name: string(entry.name, `${where}: entries[${index}].name`),
      version: string(entry.version, `${where}: entries[${index}].version`),
      license: string(entry.license, `${where}: entries[${index}].license`),
      ...(entry.repository === undefined || entry.repository === null ? {} : { repository: string(entry.repository, `${where}: entries[${index}].repository`) }),
      category: string(entry.category, `${where}: entries[${index}].category`),
      text_ids: ids as number[],
    };
  });
  return { texts, entries };
}

/** Appends `extra` to `base` the way Glaux does: its text indexes move past the texts of `base`. */
export function mergeInventories(base: Inventory, extra: Inventory): Inventory {
  const offset = base.texts.length;
  return {
    texts: [...base.texts, ...extra.texts],
    entries: [...base.entries, ...extra.entries.map((entry) => ({ ...entry, text_ids: entry.text_ids.map((id) => id + offset) }))],
  };
}

export interface GlauxSource {
  repository: string;
  commit: string;
  /** The documentation version the commit is, as in the catalog. */
  version: string;
}

/**
 * The generated files for what Glaux publishes: its editorial credits, the Rust crates, the
 * native code and the bundled art. Indexes and texts are separate files, so a page loads the
 * texts only when it shows one.
 */
export function buildGlauxFiles(files: { editorial: string; thirdParty: string; extra: string }, source: GlauxSource) {
  const editorial = parseEditorial(files.editorial);
  const inventory = mergeInventories(parseInventory(files.thirdParty, GLAUX_FILES.thirdParty), parseInventory(files.extra, GLAUX_FILES.extra));
  const category = (name: string) => inventory.entries.filter((entry) => entry.category === name);

  const known = new Set(['library', 'native', 'art']);
  const unknown = inventory.entries.find((entry) => !known.has(entry.category));
  if (unknown) throw new Error(`${unknown.name} has unknown category \`${unknown.category}\``);

  const art = category('art');
  for (const name of Object.keys(editorial.authors)) {
    if (!art.some((entry) => entry.name === name)) throw new Error(`credits.ron credits an author for \`${name}\`, which is not an art entry of the inventory`);
  }

  return {
    'editorial.json': { sections: editorial.sections, art: art.map((entry) => ({ ...entry, ...(editorial.authors[entry.name] ? { author: editorial.authors[entry.name] } : {}) })) },
    'glaux.json': { source, libraries: category('library'), native: category('native') },
    'glaux-texts.json': { texts: inventory.texts },
  };
}

/**
 * Checks out only the credit files of `revision.commit` into `cacheDir` and returns the directory.
 * Like the documentation, the commit is fetched by hash, so a branch never changes the result.
 */
export function fetchCredits(revision: Revision, cacheDir: string): string {
  const files = Object.values(GLAUX_FILES);
  if (existsSync(path.join(cacheDir, '.git')) && localCommit(cacheDir) === revision.commit && files.every((file) => existsSync(path.join(cacheDir, file)))) {
    return cacheDir;
  }
  rmSync(cacheDir, { recursive: true, force: true });
  mkdirSync(cacheDir, { recursive: true });
  git(cacheDir, 'init', '--quiet');
  git(cacheDir, 'remote', 'add', 'origin', revision.repository);
  git(cacheDir, 'sparse-checkout', 'set', '--no-cone', ...files.map((file) => `/${file}`));
  try {
    git(cacheDir, 'fetch', '--quiet', '--depth', '1', '--filter=blob:none', 'origin', revision.commit);
    git(cacheDir, 'checkout', '--quiet', '--detach', 'FETCH_HEAD');
  } catch (error) {
    rmSync(cacheDir, { recursive: true, force: true });
    throw new Error(`cannot fetch Glaux commit ${revision.commit} from ${revision.repository}: ${(error as Error).message}`);
  }
  for (const file of files) {
    if (!existsSync(path.join(cacheDir, file))) throw new Error(`Glaux commit ${revision.commit} has no ${file}`);
  }
  return cacheDir;
}

export function readGlauxFiles(dir: string) {
  return {
    editorial: readFileSync(path.join(dir, GLAUX_FILES.editorial), 'utf8'),
    thirdParty: readFileSync(path.join(dir, GLAUX_FILES.thirdParty), 'utf8'),
    extra: readFileSync(path.join(dir, GLAUX_FILES.extra), 'utf8'),
  };
}
