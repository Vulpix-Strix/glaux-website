import type { Nodes } from 'mdast';

/**
 * The `#fragment` a heading answers to. Port of `glaux_docs::page::anchor`: the
 * title in lowercase with each run of characters other than letters and digits
 * turned into one hyphen. Rust's `char::is_alphanumeric` is the Unicode
 * `Alphabetic` property plus the numeric categories, which is what the pattern
 * spells out; `\p{L}` alone would miss alphabetic marks such as Devanagari vowel signs.
 */
export function glauxAnchor(title: string): string {
  let anchor = '';
  for (const ch of title) {
    if (/[\p{Alphabetic}\p{N}]/u.test(ch)) {
      anchor += ch.toLowerCase();
    } else if (anchor !== '' && !anchor.endsWith('-')) {
      anchor += '-';
    }
  }
  return anchor.replace(/-+$/, '');
}

/**
 * The text of a heading or paragraph the way Glaux reads it (`inline_text` in `glaux_docs::page`):
 * text, inline code and the text of links and images, with line breaks as spaces and
 * raw HTML ignored.
 */
export function inlineText(node: Nodes): string {
  switch (node.type) {
    case 'text':
    case 'inlineCode':
      return node.value;
    case 'break':
      return ' ';
    case 'image':
    case 'imageReference':
      return node.alt ?? '';
    case 'html':
      return '';
    default:
      return 'children' in node ? (node.children as Nodes[]).map(inlineText).join('') : '';
  }
}

export interface AssignedAnchors {
  /** Anchor of the level 1 heading, which becomes the page title and the top of the page. */
  title: string;
  /** Anchors Glaux can resolve in the body, in document order, without repeats. */
  anchors: string[];
  /** The `id` each heading gets on the website: `headings`, then `hidden`, in the order given. */
  ids: string[];
}

/**
 * Gives the headings of one page their ids.
 *
 * Glaux finds the first heading with an anchor, and the title counts as a heading, so the
 * first holder of an anchor keeps it. Later holders and headings without letters or digits
 * are unreachable from Glaux but still need a unique `id` here; they get `-2`, `-3`... (or
 * `section`), skipping anything a Glaux anchor of the page already uses. `hidden` are headings
 * Glaux does not see at all (it only reads the top level of a page); they never keep an anchor.
 */
export function assignAnchors(title: string, headings: string[], hidden: string[] = []): AssignedAnchors {
  const titleAnchor = glauxAnchor(title);
  const native = [...headings, ...hidden].map(glauxAnchor);
  const reachable = new Set<string>();
  const first = native.map((anchor, index) => {
    if (index >= headings.length || anchor === '' || anchor === titleAnchor || reachable.has(anchor)) return false;
    reachable.add(anchor);
    return true;
  });

  const taken = new Set([titleAnchor, ...reachable]);
  const ids = native.map((anchor, index) => {
    if (first[index]) return anchor;
    const base = anchor === '' ? 'section' : anchor;
    // A repeat is the second of its name; a heading Glaux cannot see only needs a name nobody has.
    const repeat = anchor !== '' && index < headings.length;
    let id = '';
    for (let n = repeat ? 2 : 1; id === ''; n++) {
      const candidate = n === 1 ? base : `${base}-${n}`;
      if (!taken.has(candidate)) id = candidate;
    }
    taken.add(id);
    return id;
  });
  return { title: titleAnchor, anchors: [...reachable], ids };
}
