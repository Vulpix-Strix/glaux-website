import assert from 'node:assert/strict';
import { test } from 'node:test';
import { docUrl, GlauxLinkError, resolveLink } from '../src/lib/glaux/links.ts';
import type { Manifest } from '../src/lib/glaux/manifest.ts';

const manifest: Manifest = {
  source: { kind: 'local' },
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
  assert.equal(resolveLink('glaux://api/graphics/spr', ctx), '/en/docs/api/graphics/spr');
  assert.equal(resolveLink('glaux://api/graphics/spr', { ...ctx, lang: 'en' }), '/en/docs/api/graphics/spr');
});

test('folder index pages drop the index segment', () => {
  assert.equal(resolveLink('glaux://api/index', ctx), '/en/docs/api');
  assert.equal(docUrl('es', 'guide/index'), '/es/docs/guide');
});

test('fragments are preserved', () => {
  assert.equal(
    resolveLink('glaux://api/graphics/spr#parameters', ctx),
    '/en/docs/api/graphics/spr#parameters',
  );
  assert.equal(resolveLink('#parameters', ctx), '#parameters');
});

test('external links pass through', () => {
  for (const url of ['https://example.com/a#b', 'http://example.com', 'mailto:a@b.c', 'HTTPS://EXAMPLE.COM']) {
    assert.equal(resolveLink(url, ctx), url);
  }
});

test('invalid links are errors', () => {
  const code = (target: string) => {
    try {
      resolveLink(target, ctx);
    } catch (error) {
      assert.ok(error instanceof GlauxLinkError);
      return error.code;
    }
    return 'resolved';
  };
  assert.equal(code('glaux://api/nope'), 'broken-link');
  assert.equal(code('glaux://api/graphics/spr#nope'), 'broken-fragment');
  assert.equal(code('#nope'), 'broken-fragment');
  assert.equal(code(''), 'empty-link');
  assert.equal(code('../other.md'), 'relative-link');
  assert.equal(code('javascript:alert(1)'), 'unsupported-link');
  assert.equal(code('file:///etc/passwd'), 'unsupported-link');
});

test('a fragment naming the page title opens the page, as it does in Glaux', () => {
  assert.equal(resolveLink('glaux://api/graphics/spr#spr', ctx), '/en/docs/api/graphics/spr');
  assert.equal(resolveLink('#spr', ctx), '#');
});

test('links resolve in the language of the page', () => {
  const es = { manifest, lang: 'es', pageId: 'api/graphics/spr' };
  assert.equal(resolveLink('glaux://api/graphics/spr#parametros', es), '/es/docs/api/graphics/spr#parametros');
  // The Spanish headings are the ones that count, not the English ones.
  assert.throws(() => resolveLink('glaux://api/graphics/spr#parameters', es), /no heading with anchor #parameters/);
});

test('a page without translation resolves to the fallback language, with its own headings', () => {
  const es = { manifest, lang: 'es', pageId: 'api/graphics/spr' };
  assert.equal(resolveLink('glaux://api/graphics/cls', es), '/en/docs/api/graphics/cls');
  assert.equal(resolveLink('glaux://api/index#colors', es), '/en/docs/api#colors');
  assert.throws(() => resolveLink('glaux://api/index#nope', es), /no heading with anchor #nope/);
  assert.throws(() => resolveLink('glaux://api/none', es), /no page with id api\/none in es/);
});
