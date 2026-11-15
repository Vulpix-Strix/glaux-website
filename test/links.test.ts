import { assert, expect, test } from 'vitest';
import { docUrl, GlauxLinkError, resolveLink } from '@/lib/glaux/links';
import type { Manifest } from '@/lib/glaux/manifest';

const manifest: Manifest = {
  languages: {
    en: {
      'api/graphics/spr': { id: 'api/graphics/spr', title: 'spr', titleAnchor: 'spr', anchors: ['parameters'] },
      'api/graphics/cls': { id: 'api/graphics/cls', title: 'cls', titleAnchor: 'cls', anchors: ['parameters'] },
      'api/index': { id: 'api/index', title: 'API', titleAnchor: 'api', anchors: ['colors'] },
    },
    es: {
      'api/graphics/spr': { id: 'api/graphics/spr', title: 'spr', titleAnchor: 'spr', anchors: ['parametros'] },
    },
  },
  order: {},
  missing: { es: ['api/graphics/cls', 'api/index'] },
};
const ctx = { manifest, lang: 'en', pageId: 'api/graphics/spr' };

test('glaux:// ids become site URLs for the page language', () => {
  expect(resolveLink('glaux://api/graphics/spr', ctx)).toBe('/en/docs/api/graphics/spr');
  expect(resolveLink('glaux://api/graphics/spr', { ...ctx, lang: 'en' })).toBe('/en/docs/api/graphics/spr');
});

test('folder index pages drop the index segment', () => {
  expect(resolveLink('glaux://api/index', ctx)).toBe('/en/docs/api');
  expect(docUrl('es', 'guide/index')).toBe('/es/docs/guide');
});

test('fragments are preserved', () => {
  expect(resolveLink('glaux://api/graphics/spr#parameters', ctx)).toBe('/en/docs/api/graphics/spr#parameters');
  expect(resolveLink('#parameters', ctx)).toBe('#parameters');
});

test('external links pass through', () => {
  for (const url of ['https://example.com/a#b', 'http://example.com', 'mailto:a@b.c', 'HTTPS://EXAMPLE.COM']) {
    expect(resolveLink(url, ctx)).toBe(url);
  }
});

test('invalid links are errors', () => {
  const code = (target: string) => {
    try {
      resolveLink(target, ctx);
    } catch (error) {
      assert(error instanceof GlauxLinkError);
      return error.code;
    }
    return 'resolved';
  };
  expect(code('glaux://api/nope')).toBe('broken-link');
  expect(code('glaux://api/graphics/spr#nope')).toBe('broken-fragment');
  expect(code('#nope')).toBe('broken-fragment');
  expect(code('')).toBe('empty-link');
  expect(code('../other.md')).toBe('relative-link');
  expect(code('javascript:alert(1)')).toBe('unsupported-link');
  expect(code('file:///etc/passwd')).toBe('unsupported-link');
});

test('a fragment naming the page title opens the page, as it does in Glaux', () => {
  expect(resolveLink('glaux://api/graphics/spr#spr', ctx)).toBe('/en/docs/api/graphics/spr');
  expect(resolveLink('#spr', ctx)).toBe('#');
});

test('links resolve in the language of the page', () => {
  const es = { manifest, lang: 'es', pageId: 'api/graphics/spr' };
  expect(resolveLink('glaux://api/graphics/spr#parametros', es)).toBe('/es/docs/api/graphics/spr#parametros');
  // The Spanish headings are the ones that count, not the English ones.
  expect(() => resolveLink('glaux://api/graphics/spr#parameters', es)).toThrow(/no heading with anchor #parameters/);
});

test('a page without translation resolves to the fallback language, with its own headings', () => {
  const es = { manifest, lang: 'es', pageId: 'api/graphics/spr' };
  expect(resolveLink('glaux://api/graphics/cls', es)).toBe('/en/docs/api/graphics/cls');
  expect(resolveLink('glaux://api/index#colors', es)).toBe('/en/docs/api#colors');
  expect(() => resolveLink('glaux://api/index#nope', es)).toThrow(/no heading with anchor #nope/);
  expect(() => resolveLink('glaux://api/none', es)).toThrow(/no page with id api\/none in es/);
});
