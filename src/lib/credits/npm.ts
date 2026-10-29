import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { parseAllDocuments } from 'yaml';
import type { LicenseText } from './glaux.ts';

/**
 * The platform whose installed packages the inventory describes: what CI and Cloudflare
 * Workers Builds install. Whatever machine runs `credits:sync`, the result is this one.
 */
export const REFERENCE = { os: 'linux', cpu: 'x64', libc: 'glibc' } as const;

export interface Component {
  name: string;
  version: string;
  license: string;
  author?: string;
  repository?: string;
  scope: 'runtime' | 'dev';
  direct: boolean;
  /** Where the package is installed. */
  dir: string;
}

export interface LockPackage {
  os?: string[];
  cpu?: string[];
  libc?: string[];
}

export interface Lockfile {
  packages: Record<string, LockPackage>;
  snapshots: Record<string, { optionalDependencies?: Record<string, string> }>;
}

export interface NpmEntry {
  name: string;
  version: string;
  license: string;
  author?: string;
  repository?: string;
  scope: 'runtime' | 'dev';
  direct: boolean;
  /** Per-platform packages this entry stands for, such as `@esbuild/<platform>` for esbuild. */
  binaries?: string[];
  text_ids: number[];
}

export interface NpmText extends LicenseText {
  /** Where an override took the text from. */
  source?: string;
}

export interface OverrideText {
  kind: string;
  title: string;
  spdx?: string;
  /** A file below `credits/texts/`. */
  file: string;
  /** The official page the text was copied from, pinned to a commit. */
  source: string;
}

/** Texts for packages that ship none, keyed by `name@version`. */
export type NpmOverrides = Record<string, OverrideText[]>;

// ---- reading pnpm ---------------------------------------------------------------------

const pnpm = (root: string, ...args: string[]) =>
  execFileSync('pnpm', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });

export function readPnpm(root: string) {
  return {
    sbom: pnpm(root, 'sbom', '--sbom-format', 'cyclonedx'),
    licenses: pnpm(root, 'licenses', 'list', '--json'),
    lockfile: readFileSync(path.join(root, 'pnpm-lock.yaml'), 'utf8'),
  };
}

const stripParens = (license: string) => (/^\([^()]*\)$/.test(license) ? license.slice(1, -1) : license);

function cleanRepository(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const https = url
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/^ssh:\/\/git@/, 'https://')
    .replace(/^git@([^:]+):/, 'https://$1/')
    .replace(/\.git$/, '');
  return https;
}

/** Joins the SBOM (what is installed, dev or runtime, direct or not) with where each package lives. */
export function readComponents(sbomJson: string, licensesJson: string): Component[] {
  const sbom = JSON.parse(sbomJson);
  const root = sbom.metadata.component['bom-ref'];
  const direct = new Set<string>(sbom.dependencies.find((d: { ref: string }) => d.ref === root)?.dependsOn ?? []);

  const dirs = new Map<string, string>();
  for (const group of Object.values<{ name: string; versions: string[]; paths: string[] }[]>(JSON.parse(licensesJson))) {
    for (const pkg of group) {
      if (pkg.versions.length !== pkg.paths.length) throw new Error(`pnpm licenses lists ${pkg.paths.length} paths for ${pkg.versions.length} versions of ${pkg.name}`);
      pkg.versions.forEach((version, index) => dirs.set(`${pkg.name}@${version}`, pkg.paths[index]));
    }
  }

  return sbom.components.map((c: Record<string, any>): Component => {
    const name = c.group ? `${c.group}/${c.name}` : c.name;
    const dir = dirs.get(`${name}@${c.version}`);
    if (!dir) throw new Error(`${name}@${c.version} is in the SBOM but pnpm does not know where it is installed`);
    const declared = c.licenses?.[0];
    const license = declared?.expression ?? declared?.license?.id ?? declared?.license?.name;
    if (!license) throw new Error(`${name}@${c.version} declares no license`);
    const reference = (type: string) => c.externalReferences?.find((r: { type: string }) => r.type === type)?.url as string | undefined;
    return {
      name,
      version: c.version,
      license: stripParens(license),
      ...(c.authors?.[0]?.name ? { author: c.authors[0].name } : {}),
      ...(cleanRepository(reference('vcs') ?? reference('website')) ? { repository: cleanRepository(reference('vcs') ?? reference('website')) } : {}),
      scope: c.scope === 'excluded' ? 'dev' : 'runtime',
      direct: direct.has(c['bom-ref']),
      dir,
    };
  });
}

export function readLockfile(text: string): Lockfile {
  // pnpm 12 writes pnpm's own environment lockfile first and the project's after a `---`.
  const lock = parseAllDocuments(text)
    .map((document) => document.toJS())
    .filter((data) => data?.importers)
    .at(-1);
  if (!lock) throw new Error('pnpm-lock.yaml has no importers');
  return { packages: lock.packages ?? {}, snapshots: lock.snapshots ?? {} };
}

// ---- platform policy ------------------------------------------------------------------

const PLATFORM = /(?<=^|[-/])(darwin|linux|linuxmusl|win32|windows|android|freebsd|openbsd|netbsd|openharmony|sunos|aix|wasm32)(?=-|$)/;

/** `@esbuild/darwin-arm64` and `@esbuild/linux-x64` are both `@esbuild/<platform>`. */
export function familyOf(name: string): string {
  const match = PLATFORM.exec(name);
  return match ? `${name.slice(0, match.index)}<platform>` : name;
}

const allows = (list: string[] | undefined, value: string) => {
  if (!list?.length) return true;
  const yes = list.filter((item) => !item.startsWith('!'));
  return !list.includes(`!${value}`) && (yes.length === 0 || yes.includes(value));
};

/** Whether pnpm installs this package on the reference platform. */
export const installsOnReference = (pkg: LockPackage) =>
  allows(pkg.os, REFERENCE.os) && allows(pkg.cpu, REFERENCE.cpu) && allows(pkg.libc, REFERENCE.libc);

const isRestricted = (pkg: LockPackage) => Boolean(pkg.os?.length || pkg.cpu?.length || pkg.libc?.length);

const split = (key: string) => {
  const at = key.lastIndexOf('@');
  return { name: key.slice(0, at), version: key.slice(at + 1) };
};

interface Candidate {
  name: string;
  version: string;
  rep: Component;
  /** Package names that make up this entry on other platforms. */
  variants: string[];
}

/**
 * Chooses what the inventory lists out of what is installed here.
 *
 * Packages that pnpm only installs on some platforms (native binaries) would make the list
 * depend on the machine, so they are decided by the lockfile, which covers every platform:
 *
 * 1. A restricted package is part of the inventory only when pnpm installs it on the reference
 *    platform. `fsevents`, which only exists on macOS, is therefore left out and reported in
 *    `omitted`, never dropped silently. The lockfile decides, so a package that is not installed
 *    on this machine is reported all the same.
 * 2. The variants of one package (`@esbuild/darwin-arm64`, `@esbuild/linux-x64`, ...) are one
 *    entry, named `@esbuild/<platform>`, described by whichever variant is installed here.
 * 3. That entry is folded into the package that depends on it, and shown there as `binaries`,
 *    when that package has the same license: the license of esbuild covers its binaries. It stays
 *    an entry of its own when the license differs, as for libvips inside sharp.
 */
export function chooseEntries(components: Component[], lockfile: Lockfile) {
  const key = (c: { name: string; version: string }) => `${c.name}@${c.version}`;
  const restricted = new Map<string, LockPackage>();
  for (const [id, pkg] of Object.entries(lockfile.packages)) if (isRestricted(pkg)) restricted.set(id, pkg);

  const groupOf = (id: string) => {
    const { name, version } = split(id);
    return `${familyOf(name)}@${version}`;
  };
  const groups = new Map<string, { eligible: boolean; variants: Set<string> }>();
  for (const [id, pkg] of restricted) {
    const group = groups.get(groupOf(id)) ?? { eligible: false, variants: new Set<string>() };
    group.eligible ||= installsOnReference(pkg);
    group.variants.add(split(id).name);
    groups.set(groupOf(id), group);
  }

  const candidates = new Map<string, Candidate>();
  for (const component of [...components].sort((a, b) => (key(a) < key(b) ? -1 : 1))) {
    const id = key(component);
    if (!restricted.has(id)) {
      candidates.set(id, { name: component.name, version: component.version, rep: component, variants: [] });
      continue;
    }
    const group = groups.get(groupOf(id))!;
    const name = familyOf(component.name);
    if (!group.eligible) continue;
    // Several installed variants describe the same entry; the first one in order is kept.
    if (!candidates.has(`${name}@${component.version}`)) {
      candidates.set(`${name}@${component.version}`, { name, version: component.version, rep: component, variants: [...group.variants] });
    }
  }
  // Decided by the lockfile, not by what is installed, so every machine reports the same.
  const omitted = [...groups].filter(([, group]) => !group.eligible).map(([id]) => id).sort();
  for (const [id, group] of groups) {
    if (group.eligible && !candidates.has(id)) {
      throw new Error(`${id} is installed on the reference platform but no variant of it is installed here, so its license cannot be read. Run pnpm install`);
    }
  }

  // Which entry depends on which: the snapshots list the per-platform packages as optional
  // dependencies of the package that uses them.
  const hosts = new Map<string, Set<string>>();
  for (const [snapshot, { optionalDependencies }] of Object.entries(lockfile.snapshots)) {
    if (!optionalDependencies) continue;
    const parent = snapshot.replace(/\(.*$/, '');
    const parentGroup = restricted.has(parent) ? groupOf(parent) : parent;
    for (const [name, version] of Object.entries(optionalDependencies)) {
      const child = groupOf(`${name}@${version}`);
      if (child !== parentGroup && restricted.has(`${name}@${version}`)) {
        hosts.set(child, (hosts.get(child) ?? new Set()).add(parentGroup));
      }
    }
  }

  const foldedInto = new Map<string, string>();
  const finalHost = (id: string): string => (foldedInto.has(id) ? finalHost(foldedInto.get(id)!) : id);
  for (const [id, candidate] of candidates) {
    if (!candidate.variants.length) continue;
    const parents = [...(hosts.get(id) ?? [])].map(finalHost);
    const host = parents.length === 1 ? candidates.get(parents[0]) : undefined;
    if (host && host.rep.license === candidate.rep.license) foldedInto.set(id, parents[0]);
  }

  const binaries = new Map<string, string[]>();
  for (const id of foldedInto.keys()) {
    const host = finalHost(id);
    binaries.set(host, [...(binaries.get(host) ?? []), candidates.get(id)!.name]);
  }
  const entries = [...candidates].filter(([id]) => !foldedInto.has(id)).map(([id, c]) => ({ ...c, binaries: (binaries.get(id) ?? []).sort() }));
  return { entries, omitted };
}

// ---- legal texts ----------------------------------------------------------------------

const LEGAL_FILE = /^(licen[cs]e|copying|unlicen[cs]e|notice)([^a-z].*)?$/i;

const clean = (content: string) => content.replace(/\r\n/g, '\n').replace(/\s+$/, '');

/** The legal files a package ships. A README is never taken for one. */
export function legalFiles(dir: string): { file: string; kind: 'license' | 'notice'; content: string }[] {
  return readdirSync(dir)
    .filter((file) => LEGAL_FILE.test(file) && statSync(path.join(dir, file)).isFile())
    .sort()
    .map((file) => ({ file, kind: /^notice/i.test(file) ? ('notice' as const) : ('license' as const), content: clean(readFileSync(path.join(dir, file), 'utf8')) }))
    .filter((found) => found.content !== '');
}

export function parseOverrides(json: string): NpmOverrides {
  const data = JSON.parse(json);
  const out: NpmOverrides = {};
  for (const [pkg, texts] of Object.entries<Record<string, string>[]>(data.npm ?? {})) {
    if (!Array.isArray(texts) || texts.length === 0) throw new Error(`overrides: ${pkg} needs at least one text`);
    out[pkg] = texts.map((text) => {
      for (const field of ['kind', 'title', 'file', 'source']) {
        if (typeof text[field] !== 'string' || text[field] === '') throw new Error(`overrides: ${pkg} has a text without \`${field}\``);
      }
      if (!['license', 'notice'].includes(text.kind)) throw new Error(`overrides: ${pkg} has a text of unknown kind \`${text.kind}\``);
      if (!/^https:\/\/\S+$/.test(text.source)) throw new Error(`overrides: the source of ${pkg} must be an https URL`);
      // `retrieved` and `note` document where the text came from and are not published.
      return { kind: text.kind, title: text.title, ...(text.spdx ? { spdx: text.spdx } : {}), file: text.file, source: text.source };
    });
  }
  return out;
}

export interface NpmInventory {
  entries: NpmEntry[];
  texts: NpmText[];
  omitted: string[];
}

/**
 * Builds the npm inventory. Every entry must end up with the text of its license: found in the
 * package, or taken from an override that names its official source. An entry with neither is an
 * error, and so is an override that is not needed, so none outlives a package update.
 */
export function buildNpm(components: Component[], lockfile: Lockfile, overrides: NpmOverrides, readOverride: (file: string) => string): NpmInventory {
  const { entries: chosen, omitted } = chooseEntries(components, lockfile);
  const texts: NpmText[] = [];
  const known = new Map<string, number>();
  const add = (text: NpmText) => {
    const hash = createHash('sha256').update(text.content.replace(/\s+/g, ' ')).digest('hex');
    if (!known.has(hash)) known.set(hash, texts.push(text) - 1);
    return known.get(hash)!;
  };

  const used = new Set<string>();
  const missing: string[] = [];
  const entries = chosen.map(({ name, version, rep, binaries }): NpmEntry => {
    const id = `${name}@${version}`;
    const found = legalFiles(rep.dir);
    const override = overrides[id];
    if (found.length && override) throw new Error(`overrides: ${id} ships its own license text, so the override is not needed`);
    if (override) used.add(id);
    const text_ids = found.length
      ? found.map(({ file, kind, content }) =>
          add({ kind, title: file, ...(found.length === 1 && /^[A-Za-z0-9.+-]+$/.test(rep.license) ? { spdx: rep.license } : {}), content }),
        )
      : (override ?? []).map((text) => add({ kind: text.kind, title: text.title, ...(text.spdx ? { spdx: text.spdx } : {}), content: clean(readOverride(text.file)), source: text.source }));
    if (text_ids.length === 0) missing.push(id);
    return {
      name,
      version,
      license: rep.license,
      ...(rep.author ? { author: rep.author } : {}),
      ...(rep.repository ? { repository: rep.repository } : {}),
      scope: rep.scope,
      direct: rep.direct,
      ...(binaries.length ? { binaries } : {}),
      text_ids,
    };
  });

  if (missing.length) throw new Error(`no license text for ${missing.join(', ')}. Add the official text to credits/overrides.json with its source`);
  const stale = Object.keys(overrides).filter((id) => !used.has(id));
  if (stale.length) throw new Error(`overrides for ${stale.join(', ')} match no package without a license text. Remove them or check the package version`);
  return { entries, texts, omitted };
}
