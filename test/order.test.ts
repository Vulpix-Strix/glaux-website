import { existsSync } from 'node:fs';
import { expect, test } from 'vitest';
import { folderOrders, orderPages } from '@/lib/glaux/order';
import { syncDocs } from '@/lib/glaux/sync';
import { glauxDocs, tempDir } from './helpers.ts';

// The cases mirror the tests of `order` in apps/glaux/src/system/workspace/docs/nav/tests.rs: the
// website must list pages the way the Glaux documentation browser does.

/** `{ id: [links in order] }` from `id -> ids it links to`. */
const links = (pages: Record<string, string[]>) =>
  Object.fromEntries(Object.entries(pages).map(([id, to]) => [id, to.map((t) => `glaux://${t}`)]));

test('a section follows the links of its index and then the rest by id', () => {
  const pages = links({ 'guide/index': ['guide/z', 'guide/m'], 'guide/a': [], 'guide/m': [], 'guide/z': [] });
  expect(orderPages(['en'], { en: pages })).toStrictEqual(['guide/index', 'guide/z', 'guide/m', 'guide/a']);
});

test('guides come first, then the API, then other sections by name', () => {
  const pages = links({ 'zeta/x': [], 'api/f': [], 'guide/g': [], 'extra/e': [] });
  expect(orderPages(['en'], { en: pages })).toStrictEqual(['guide/g', 'api/f', 'extra/e', 'zeta/x']);
});

test('only index pages decide the order of what they link to', () => {
  const pages = links({ 'guide/index': ['guide/b', 'guide/a'], 'guide/b': ['guide/c'], 'guide/a': [], 'guide/c': [] });
  expect(orderPages(['en'], { en: pages })).toStrictEqual(['guide/index', 'guide/b', 'guide/a', 'guide/c']);
});

test('links to other sections, missing pages and fragments are handled', () => {
  const pages = {
    'guide/index': ['glaux://api/x', 'glaux://guide/none', 'glaux://guide/b#part', 'https://example.com/guide/a'],
    'guide/b': [],
    'api/x': [],
  };
  expect(orderPages(['en'], { en: pages })).toStrictEqual(['guide/index', 'guide/b', 'api/x']);
});

test('nested index pages order their own folder when an index links to them', () => {
  const pages = links({
    'api/index': ['api/audio/index', 'api/time/t'],
    'api/audio/index': ['api/audio/tone', 'api/audio/env'],
    'api/audio/env': [],
    'api/audio/tone': [],
    'api/time/t': [],
  });
  expect(orderPages(['en'], { en: pages })).toStrictEqual([
    'api/index',
    'api/audio/index',
    'api/audio/tone',
    'api/audio/env',
    'api/time/t',
  ]);
});

test('pages from every language of the chain are listed once, and an earlier language wins', () => {
  const en = links({ 'guide/index': ['guide/a', 'guide/b'], 'guide/a': [], 'guide/b': [] });
  const es = links({ 'guide/index': ['guide/b', 'guide/a'], 'guide/c': [] });
  expect(orderPages(['es', 'en'], { en, es })).toStrictEqual(['guide/index', 'guide/b', 'guide/a', 'guide/c']);
  expect(orderPages(['en'], { en, es })).toStrictEqual(['guide/index', 'guide/a', 'guide/b']);
});

test('folders list their children in order of appearance, without the index page', () => {
  const order = ['guide/index', 'guide/b', 'api/index', 'api/audio/index', 'api/audio/tone', 'api/time/t', 'api/audio/env'];
  expect([...folderOrders(order)]).toStrictEqual([
    ['', ['guide', 'api']],
    ['guide', ['b']],
    ['api', ['audio', 'time']],
    ['api/audio', ['tone', 'env']],
    ['api/time', ['t']],
  ]);
});

test('the manual lists each page once, the guide first, starting at its index', { skip: !existsSync(glauxDocs) }, () => {
  const { order, languages } = syncDocs(glauxDocs, tempDir());
  expect(order.en[0]).toBe('guide/index');
  expect([...order.en].sort()).toStrictEqual(Object.keys(languages.en).sort());
  expect(new Set(order.en).size).toBe(order.en.length);
  expect(order.en.indexOf('guide/game-loop') < order.en.indexOf('api/index')).toBeTruthy();
});
