import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { tempDir } from './helpers.ts';
import { loadContent, parseContent } from '@/lib/editorial/content';
import { createPost, slugify } from '@/lib/editorial/scaffold';

const title = 'Construyendo Glaux: una consola que nunca existió';

test('slugs drop accents and special characters', () => {
  expect(slugify(title)).toBe('construyendo-glaux-una-consola-que-nunca-existio');
  expect(slugify('  ¿Qué hay de nuevo?  Ñandú & Co. 2.0! ')).toBe('que-hay-de-nuevo-nandu-co-2-0');
  expect(slugify('日本語')).toBe('');
});

test('a post with only a title is a Spanish blog draft that the catalog accepts', () => {
  const root = tempDir();
  const [file] = createPost(root, { title });
  expect(file).toBe(path.join(root, 'es/blog/construyendo-glaux-una-consola-que-nunca-existio.mdx'));
  const { article } = parseContent(file, root);
  expect(article).toMatchObject({
    id: 'construyendo-glaux-una-consola-que-nunca-existio',
    title,
    status: 'draft',
    categories: ['development'],
    lang: 'es',
    section: 'blog',
    description: '',
  });
  expect(article.date).toBe(undefined);
  expect(loadContent(root, false)).toStrictEqual([]);
  expect(loadContent(root, true).length).toBe(1);
  // No asset folder or other files are created up front.
  expect(existsSync(path.join(root, 'assets'))).toBe(false);
});

test('titles with quotes and colons stay valid frontmatter', () => {
  const root = tempDir();
  const [file] = createPost(root, { title: 'Say "hello": a test' });
  expect(parseContent(file, root).article.title).toBe('Say "hello": a test');
});

test('both languages share one id, and section and id can be chosen', () => {
  const root = tempDir();
  const files = createPost(root, { title: 'Release notes', lang: 'both', section: 'news', id: 'release-1' });
  expect(files.map((file) => path.relative(root, file))).toStrictEqual([
    'es/news/release-notes.mdx',
    'en/news/release-notes.mdx',
  ]);
  const ids = files.map((file) => parseContent(file, root).article.id);
  expect(ids).toStrictEqual(['release-1', 'release-1']);
});

test('existing files and duplicate ids are never overwritten', () => {
  const root = tempDir();
  const [file] = createPost(root, { title: 'First' });
  const original = readFileSync(file, 'utf8');
  expect(() => createPost(root, { title: 'First' })).toThrow(/already exists/);
  expect(() => createPost(root, { title: 'Second', id: 'first' })).toThrow(/already used/);
  expect(readFileSync(file, 'utf8')).toBe(original);
  // The same id is fine in another section.
  expect(() => createPost(root, { title: 'Second', id: 'first', section: 'news' })).not.toThrow();
  // A conflict in one language writes nothing in the other.
  createPost(root, { title: 'Third', lang: 'en' });
  expect(() => createPost(root, { title: 'Third', lang: 'both' })).toThrow(/already exists/);
  expect(existsSync(path.join(root, 'es/blog/third.mdx'))).toBe(false);
});

test('invalid input is rejected before anything is written', () => {
  const root = tempDir();
  expect(() => createPost(root, { title: '   ' })).toThrow(/title/);
  expect(() => createPost(root, { title: '日本語' })).toThrow(/letters or numbers/);
  expect(() => createPost(root, { title: 'Ok', id: 'Not Valid' })).toThrow(/Invalid id/);
  expect(() => createPost(root, { title: 'Ok', lang: 'fr' as never })).toThrow(/language/);
  expect(() => createPost(root, { title: 'Ok', section: 'docs' as never })).toThrow(/section/);
  expect(existsSync(path.join(root, 'es'))).toBe(false);
});
