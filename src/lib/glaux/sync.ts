import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Definition, Heading, Root } from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { assignAnchors, inlineText } from './anchor.ts';
import { GlauxLinkError, resolveLink } from './links.ts';
import { FALLBACK_LANGUAGE } from './manifest.ts';
import type { Manifest, ManifestPage, ManifestSource } from './manifest.ts';
import { folderOrders, orderPages } from './order.ts';

const LANGUAGE_DIR = /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/;
/** Marks a directory this module owns, so it never empties one it did not create. */
const MARKER = '.glaux-generated';

export interface SyncOptions {
  /** Recorded in the manifest. */
  source?: ManifestSource;
}

interface LinkRef {
  target: string;
  line: number;
}

interface ParsedPage {
  page: ManifestPage;
  body: string;
  /** The links Glaux counts (it orders pages by the ones an index page has), in order. */
  links: LinkRef[];
  /** Link targets that only exist as reference definitions. They are checked but order nothing. */
  definitions: LinkRef[];
}

function markdownFiles(dir: string, base = dir): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return markdownFiles(full, base);
      return entry.name.endsWith('.md') ? [path.relative(base, full)] : [];
    })
    .sort();
}

// Glaux reads pages as GitHub Flavored Markdown, so headings are read with the same extensions.
const parser = unified().use(remarkParse).use(remarkGfm);

function parsePage(id: string, source: string, label: string): ParsedPage {
  const tree = parser.parse(source) as Root;
  const title = tree.children.find((n): n is Heading => n.type === 'heading' && n.depth === 1);
  if (!title?.position) throw new Error(`${label}: the page has no level 1 heading`);
  const summary = tree.children.find((n) => n.type === 'paragraph');
  // Glaux only knows the headings at the top level of the page. The first level 1 heading
  // becomes the page title, not a heading of the body.
  const headings = tree.children.filter((n): n is Heading => n.type === 'heading' && n !== title);
  const { title: titleAnchor, anchors } = assignAnchors(
    inlineText(title),
    headings.map((n) => inlineText(n)),
  );

  const definitions = new Map<string, string>();
  const unused: LinkRef[] = [];
  visit(tree, 'definition', (node: Definition) => {
    definitions.set(node.identifier, node.url);
    unused.push({ target: node.url, line: node.position?.start.line ?? 0 });
  });
  const links: LinkRef[] = [];
  visit(tree, (node) => {
    const line = node.position?.start.line ?? 0;
    if (node.type === 'link') links.push({ target: node.url, line });
    if (node.type === 'linkReference') {
      const target = definitions.get(node.identifier);
      if (target !== undefined) links.push({ target, line });
    }
  });

  // The title becomes frontmatter; the rest of the text is kept byte for byte.
  const { start, end } = title.position;
  const body = source.slice(0, start.offset!) + source.slice(end.offset!).replace(/^\r?\n/, '');
  const oneLine = (text: string) => text.replace(/\s*\n\s*/g, ' ');
  return {
    page: {
      id,
      title: oneLine(inlineText(title)),
      description: summary ? oneLine(inlineText(summary)) : undefined,
      titleAnchor,
      anchors,
    },
    body: body.replace(/^\s+/, ''),
    links,
    definitions: unused,
  };
}

function frontmatter(page: ManifestPage): string {
  // JSON strings are valid YAML scalars.
  const lines = [`title: ${JSON.stringify(page.title)}`];
  if (page.description) lines.push(`description: ${JSON.stringify(page.description)}`);
  return `---\n${lines.join('\n')}\n---\n\n`;
}

/** Every problem the documentation has, so one run lists them all. */
class Problems {
  list: string[] = [];
  add(where: string, message: string) {
    this.list.push(`${where}: ${message}`);
  }
  throwIfAny() {
    if (this.list.length > 0) {
      throw new Error(`the Glaux documentation has ${this.list.length} problem(s):\n${this.list.map((p) => `  ${p}`).join('\n')}`);
    }
  }
}

/** The ids in `ids.lock`, which Glaux promises keep resolving. */
function publishedIds(sourceDir: string): string[] {
  let text: string;
  try {
    text = readFileSync(path.join(sourceDir, 'ids.lock'), 'utf8');
  } catch {
    return [];
  }
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
}

/**
 * Reads the pages of a Glaux `docs/` directory and writes them, ready for
 * Fumadocs, to `out`. The source is only read. Returns what was written.
 *
 * Fails, listing every problem, when a published page is missing, a translation has
 * no original, or a link or heading fragment does not resolve.
 */
export function syncDocs(sourceDir: string, outDir: string, options: SyncOptions = {}): Manifest {
  if (!statSync(sourceDir, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`Glaux docs not found at ${sourceDir}; set GLAUX_DOCS_DIR, pass --source or use --locked`);
  }
  const owned = statSync(path.join(outDir, MARKER), { throwIfNoEntry: false });
  if (statSync(outDir, { throwIfNoEntry: false }) && !owned && readdirSync(outDir).length > 0) {
    throw new Error(`${outDir} exists and was not generated by this script; refusing to empty it`);
  }

  const languages = readdirSync(sourceDir, { withFileTypes: true })
    // `docs/api/` holds RON files and looks like a language tag, so require Markdown inside.
    .filter((e) => e.isDirectory() && LANGUAGE_DIR.test(e.name) && markdownFiles(path.join(sourceDir, e.name)).length > 0)
    .map((e) => e.name)
    .sort();
  if (!languages.includes(FALLBACK_LANGUAGE)) {
    throw new Error(`${sourceDir} has no ${FALLBACK_LANGUAGE}/ pages, and ${FALLBACK_LANGUAGE} is the fallback for every language`);
  }

  const manifest: Manifest = { source: options.source ?? { kind: 'local' }, languages: {}, order: {}, missing: {} };
  const parsed: Record<string, Record<string, ParsedPage>> = {};
  for (const lang of languages) {
    const langSource = path.join(sourceDir, lang);
    parsed[lang] = {};
    manifest.languages[lang] = {};
    for (const file of markdownFiles(langSource)) {
      const id = file.split(path.sep).join('/').replace(/\.md$/, '');
      const result = parsePage(id, readFileSync(path.join(langSource, file), 'utf8'), `${lang}/${id}`);
      parsed[lang][id] = result;
      manifest.languages[lang][id] = result.page;
    }
  }

  const problems = new Problems();
  const english = manifest.languages[FALLBACK_LANGUAGE];
  for (const id of publishedIds(sourceDir)) {
    if (!english[id]) problems.add('ids.lock', `${id} was published but has no ${FALLBACK_LANGUAGE} page`);
  }
  for (const lang of languages) {
    if (lang !== FALLBACK_LANGUAGE) {
      for (const id of Object.keys(manifest.languages[lang])) {
        if (!english[id]) problems.add(`${lang}/${id}.md`, `there is no ${FALLBACK_LANGUAGE} page with this id`);
      }
      manifest.missing[lang] = Object.keys(english).filter((id) => !manifest.languages[lang][id]);
    }
    for (const [id, { links, definitions }] of Object.entries(parsed[lang])) {
      for (const { target, line } of [...links, ...definitions]) {
        try {
          resolveLink(target, { manifest, lang, pageId: id });
        } catch (error) {
          if (!(error instanceof GlauxLinkError)) throw error;
          problems.add(`${lang}/${id}.md:${line}`, `${error.message} (${error.code})`);
        }
      }
    }
  }
  problems.throwIfAny();

  const linksByLang: Record<string, Record<string, string[]>> = {};
  for (const lang of languages) {
    linksByLang[lang] = Object.fromEntries(Object.entries(parsed[lang]).map(([id, p]) => [id, p.links.map((l) => l.target)]));
  }

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, MARKER), 'Generated by scripts/sync-glaux-docs.ts. Do not edit.\n');

  for (const lang of languages) {
    for (const [id, { page, body }] of Object.entries(parsed[lang])) {
      const target = path.join(outDir, lang, `${id}.md`);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, frontmatter(page) + body);
    }
    // The order is Glaux's, resolved through the languages this one falls back to; the
    // folder files only list what this language has, and the fallback fills in the rest.
    const chain = lang === FALLBACK_LANGUAGE ? [lang] : [lang, FALLBACK_LANGUAGE];
    manifest.order[lang] = orderPages(chain, linksByLang);
    const own = manifest.order[lang].filter((id) => manifest.languages[lang][id]);
    for (const [folder, pages] of folderOrders(own)) {
      writeFileSync(path.join(outDir, lang, folder, 'meta.json'), JSON.stringify({ pages }, null, 2) + '\n');
    }
  }
  // Images are relative paths into the docs tree (`../../assets/x.png`), so `assets/` keeps its place.
  if (statSync(path.join(sourceDir, 'assets'), { throwIfNoEntry: false })?.isDirectory()) {
    cpSync(path.join(sourceDir, 'assets'), path.join(outDir, 'assets'), { recursive: true });
  }
  writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}
