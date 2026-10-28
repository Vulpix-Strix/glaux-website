import { FALLBACK_LANGUAGE } from './manifest.ts';
import type { Manifest } from './manifest.ts';

const INTERNAL_SCHEME = 'glaux';
/** Schemes a Glaux viewer hands to the system. Mirrors `glaux_docs::link::EXTERNAL_SCHEMES`. */
const EXTERNAL_SCHEMES = ['http', 'https', 'mailto'];

export class GlauxLinkError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'GlauxLinkError';
    this.code = code;
  }
}

/** The URI scheme `target` starts with, or `undefined` for a relative path. Port of `glaux_docs::link::scheme`. */
function scheme(target: string): string | undefined {
  const colon = target.indexOf(':');
  if (colon < 0) return undefined;
  const found = target.slice(0, colon);
  return /^[A-Za-z0-9+.-]+$/.test(found) ? found : undefined;
}

/** `api/graphics/spr` in `en` is `/en/docs/api/graphics/spr`. A trailing `index` is the folder page. */
export function docUrl(lang: string, id: string): string {
  const slugs = id.split('/');
  if (slugs.at(-1) === 'index') slugs.pop();
  return ['', lang, 'docs', ...slugs].join('/');
}

export interface LinkContext {
  manifest: Manifest;
  lang: string;
  /** Id of the page that holds the link, for `#fragment` links to itself. */
  pageId: string;
}

/**
 * Turns a link target of a Glaux page into one for the website, or throws a
 * {@link GlauxLinkError}. External links pass through unchanged; anything the
 * Glaux viewer would block is an error here too.
 *
 * A page the language has not translated is looked up in the fallback language, as the
 * Glaux viewer does, and the link goes to the page that exists. A fragment is checked
 * against the headings of the page it ends up on; one that names the title opens the page.
 */
export function resolveLink(target: string, { manifest, lang, pageId }: LinkContext): string {
  if (target === '') throw new GlauxLinkError('empty-link', 'link has no target');

  const own = manifest.languages[lang];
  if (!own) throw new GlauxLinkError('unknown-language', `no pages for language ${lang}`);

  /** The language that has page `id`, and the fragment as a URL suffix. */
  const locate = (id: string, fragment: string | undefined): { lang: string; suffix: string } => {
    const found = [lang, FALLBACK_LANGUAGE].find((l) => manifest.languages[l]?.[id]);
    if (!found) throw new GlauxLinkError('broken-link', `no page with id ${id} in ${lang}`);
    const page = manifest.languages[found][id];
    if (fragment === undefined) return { lang: found, suffix: '' };
    if (fragment === page.titleAnchor) return { lang: found, suffix: '' };
    if (!page.anchors.includes(fragment)) {
      throw new GlauxLinkError('broken-fragment', `page ${id} has no heading with anchor #${fragment}`);
    }
    return { lang: found, suffix: `#${fragment}` };
  };

  if (target.startsWith('#')) {
    const { suffix } = locate(pageId, target.slice(1));
    return suffix === '' ? '#' : suffix;
  }

  const found = scheme(target);
  if (found === undefined) {
    throw new GlauxLinkError(
      'relative-link',
      `${JSON.stringify(target)} is a file path; link to a page with ${INTERNAL_SCHEME}://<id>`,
    );
  }
  if (found.toLowerCase() === INTERNAL_SCHEME) {
    const [id, fragment] = splitFragment(target.slice(INTERNAL_SCHEME.length + 3));
    const where = locate(id, fragment);
    return docUrl(where.lang, id) + where.suffix;
  }
  if (EXTERNAL_SCHEMES.includes(found.toLowerCase())) return target;
  throw new GlauxLinkError('unsupported-link', `links with scheme ${found}: are not supported`);
}

function splitFragment(rest: string): [string, string | undefined] {
  const hash = rest.indexOf('#');
  return hash < 0 ? [rest, undefined] : [rest.slice(0, hash), rest.slice(hash + 1)];
}
