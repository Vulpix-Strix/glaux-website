// Build-time only: creates the MDX file of a new article.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { sections, type EditorialSection } from './model.ts';

export const languages = ['es', 'en'] as const;
export type PostLanguage = (typeof languages)[number];

export interface NewPost {
  title: string;
  lang?: PostLanguage | 'both';
  section?: EditorialSection;
  id?: string;
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function existingIds(dir: string): Set<string> {
  if (!existsSync(dir)) return new Set();
  const ids = readdirSync(dir)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(path.join(dir, file), 'utf8')))
    .map((match) => (match ? (parse(match[1]) as { id?: unknown } | null)?.id : undefined));
  return new Set(ids.filter((id): id is string => typeof id === 'string'));
}

/** Writes the draft file(s) and returns their paths. Nothing is written if any check fails. */
export function createPost(root: string, post: NewPost): string[] {
  const { title, lang = 'es', section = 'blog' } = post;
  if (!title.trim()) throw new Error('A title is required');
  if (lang !== 'both' && !languages.includes(lang)) throw new Error(`Unknown language: ${lang}`);
  if (!sections.includes(section)) throw new Error(`Unknown section: ${section}`);
  const slug = slugify(title);
  if (!slugPattern.test(slug)) throw new Error('The title must contain letters or numbers');
  const id = post.id ?? slug;
  if (!slugPattern.test(id)) throw new Error(`Invalid id: ${id}. Use lowercase letters, numbers and hyphens`);

  const targets = (lang === 'both' ? languages : [lang]).map((code) => {
    const dir = path.join(root, code, section);
    const file = path.join(dir, `${slug}.mdx`);
    if (existsSync(file)) throw new Error(`${file} already exists`);
    if (existingIds(dir).has(id)) throw new Error(`The id "${id}" is already used in ${code}/${section}`);
    return { dir, file };
  });

  const source = [
    '---',
    `id: ${id}`,
    `title: ${JSON.stringify(title.trim())}`,
    'description: ""',
    'status: draft',
    'categories: [development]',
    '---',
    '',
    '',
  ].join('\n');
  for (const { dir, file } of targets) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, source);
  }
  return targets.map(({ file }) => file);
}
