/** The sections listed first, in this order. Mirrors `FIRST_SECTIONS` in Glaux's `workspace/docs/nav.rs`. */
const FIRST_SECTIONS = ['guide', 'api'];

/** The ids a page links to with `glaux://`, in the order the links appear. */
export type PageLinks = Record<string, string[]>;

const section = (id: string) => id.split('/')[0];

function linkedId(target: string): string | undefined {
  if (!target.startsWith('glaux://')) return undefined;
  return target.slice('glaux://'.length).split('#')[0];
}

/**
 * The editorial order of the pages a language shows, as the Glaux documentation browser
 * lists them (`order` in `apps/glaux/src/system/workspace/docs/nav.rs`). Glaux pages carry
 * no order of their own, so each section follows its `index` page: the pages it links to
 * come in the order the links appear, and any left over follow by id. Only index pages
 * order what they link to, and only within their own section.
 *
 * `chain` is the language followed by the ones it falls back to; `pages` maps each
 * language to its pages' links. A page of an earlier language hides the same id of a later one.
 */
export function orderPages(chain: string[], pages: Record<string, PageLinks>): string[] {
  const all = [...new Set(chain.flatMap((lang) => Object.keys(pages[lang] ?? {})))].sort();
  const linksOf = (id: string): string[] => {
    const lang = chain.find((l) => pages[l]?.[id]);
    return lang ? pages[lang][id] : [];
  };
  const present = new Set(all);

  const sections = [...new Set(all.map(section))].sort((a, b) => {
    const rank = (name: string) => {
      const at = FIRST_SECTIONS.indexOf(name);
      return at < 0 ? FIRST_SECTIONS.length : at;
    };
    return rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0);
  });

  const ordered: string[] = [];
  const seen = new Set<string>();
  const visit = (name: string, id: string) => {
    if (!present.has(id) || seen.has(id)) return;
    seen.add(id);
    ordered.push(id);
    if (!id.endsWith('/index') && id !== 'index') return;
    for (const target of linksOf(id)) {
      const linked = linkedId(target);
      if (linked !== undefined && section(linked) === name) visit(name, linked);
    }
  };

  for (const name of sections) {
    visit(name, `${name}/index`);
    for (const id of all) {
      if (section(id) === name && !seen.has(id)) {
        seen.add(id);
        ordered.push(id);
      }
    }
  }
  return ordered;
}

/**
 * The `pages` of every folder's `meta.json` for pages in `order`: the children of each
 * folder in the order they first appear. A folder's own `index` page is left out, since
 * Fumadocs makes it the folder's page.
 */
export function folderOrders(order: string[]): Map<string, string[]> {
  const folders = new Map<string, string[]>();
  for (const id of order) {
    const segments = id.split('/');
    for (let depth = 0; depth < segments.length; depth++) {
      if (depth > 0 && depth === segments.length - 1 && segments[depth] === 'index') break;
      const folder = segments.slice(0, depth).join('/');
      const children = folders.get(folder) ?? [];
      if (!children.includes(segments[depth])) children.push(segments[depth]);
      folders.set(folder, children);
    }
  }
  return folders;
}
