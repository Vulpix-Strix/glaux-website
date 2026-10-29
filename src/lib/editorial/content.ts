// Build-time only. Neither filesystem access nor MDX compilation enters the Worker.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import { createProcessor } from '@mdx-js/mdx';
import readingTime from 'reading-time';
import { toString } from 'mdast-util-to-string';
import { categories, type Article, type EditorialImage } from './model.ts';

export interface ContentEntry {
  article: Article;
  body: string;
  file: string;
}
export interface ContentAsset {
  file: string;
  url: string;
}
export function walkContent(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walkContent(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
  );
}
function text(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing or invalid ${name}`);
  return value;
}
function positive(value: unknown, name: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new Error(`Invalid ${name}`);
  return Number(value);
}
export function parseContent(file: string, root: string): ContentEntry {
  const source = readFileSync(file, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source);
  if (!match) throw new Error(`${file}: frontmatter is required`);
  const data = parse(match[1]) as Record<string, unknown>;
  if (!data || typeof data !== 'object') throw new Error(`${file}: invalid frontmatter`);
  const [lang, section, filename] = path.relative(root, file).split(path.sep);
  if (
    !['en', 'es'].includes(lang) ||
    !['news', 'blog'].includes(section) ||
    !filename ||
    path.relative(root, file).split(path.sep).length !== 3
  )
    throw new Error(`${file}: expected {en,es}/{news,blog}/{slug}.mdx`);
  const slug = path.basename(filename, '.mdx');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${file}: invalid slug`);
  if (data.status !== 'draft' && data.status !== 'published')
    throw new Error(`${file}: status must be draft or published`);
  if (
    !Array.isArray(data.categories) ||
    !data.categories.length ||
    data.categories.some((category) => !categories.includes(category))
  )
    throw new Error(`${file}: invalid categories`);
  const date = data.date === undefined ? undefined : text(data.date, 'date');
  if (
    (data.status === 'published' && !date) ||
    (date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date))
  )
    throw new Error(`${file}: date must be YYYY-MM-DD`);
  const body = source.slice(match[0].length);
  const tree = createProcessor().parse(body);
  // Components come from the editorial registry. Imports could bypass the publication asset boundary.
  if (tree.children.some((node) => node.type === 'mdxjsEsm'))
    throw new Error(`${file}: use registered MDX components instead of imports or exports`);
  const searchText = toString(tree);
  const stats = readingTime(searchText);
  let cover: EditorialImage | undefined;
  if (data.cover) {
    const image = data.cover as Record<string, unknown>;
    cover = {
      src: text(image.src, 'cover.src'),
      alt: text(image.alt, 'cover.alt'),
      width: positive(image.width, 'cover.width'),
      height: positive(image.height, 'cover.height'),
      caption: image.caption === undefined ? undefined : text(image.caption, 'cover.caption'),
    };
  }
  let series: Article['series'];
  if (data.series) {
    const item = data.series as Record<string, unknown>;
    series = {
      id: text(item.id, 'series.id'),
      title: text(item.title, 'series.title'),
      part: positive(item.part, 'series.part'),
    };
  }
  const presentation = data.presentation ?? 'story';
  if (!['story', 'brief', 'showcase', 'event', 'video'].includes(String(presentation)))
    throw new Error(`${file}: invalid presentation`);
  let event: Article['event'];
  if (data.event) {
    const item = data.event as Record<string, unknown>;
    event = {
      start: text(item.start, 'event.start'),
      end: text(item.end, 'event.end'),
      timeZone: text(item.timeZone, 'event.timeZone'),
      location: text(item.location, 'event.location'),
    };
    if (
      !Number.isFinite(Date.parse(event.start)) ||
      Date.parse(event.end) <= Date.parse(event.start) ||
      !/(Z|[+-]\d\d:\d\d)$/.test(event.start) ||
      !/(Z|[+-]\d\d:\d\d)$/.test(event.end)
    )
      throw new Error(`${file}: invalid event dates or offsets`);
    new Intl.DateTimeFormat('en', { timeZone: event.timeZone });
  }
  if (presentation === 'event' && !event)
    throw new Error(`${file}: event presentation needs event metadata`);
  return {
    file,
    body,
    article: {
      id: text(data.id, 'id'),
      lang: lang as Article['lang'],
      section: section as Article['section'],
      slug,
      title: text(data.title, 'title'),
      description: text(data.description, 'description'),
      date,
      status: data.status,
      categories: [...new Set(data.categories)] as Article['categories'],
      cover,
      series,
      event,
      author: data.author === undefined ? undefined : text(data.author, 'author'),
      notice: data.notice === undefined ? undefined : text(data.notice, 'notice'),
      featured: data.featured === true,
      number: data.number === undefined ? undefined : positive(data.number, 'number'),
      presentation: presentation as Article['presentation'],
      words: stats.words,
      minutes: Math.max(1, Math.ceil(stats.minutes)),
      searchText,
    },
  };
}
export function loadContent(root: string, development: boolean): ContentEntry[] {
  const entries = walkContent(root)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => parseContent(file, root));
  const identities = new Set<string>();
  const parts = new Set<string>();
  for (const { article } of entries) {
    const key = `${article.lang}/${article.section}/${article.id}`;
    if (identities.has(key)) throw new Error(`Duplicate article identity: ${key}`);
    identities.add(key);
    if (article.series) {
      const part = `${article.lang}/${article.section}/${article.series.id}/${article.series.part}`;
      if (parts.has(part)) throw new Error(`Duplicate series part: ${part}`);
      parts.add(part);
    }
  }
  return entries.filter(({ article }) => development || article.status === 'published');
}
export function resolveContentAssets(
  entry: ContentEntry,
  root: string,
  assets: Map<string, ContentAsset>,
): ContentEntry {
  function replace(source: string) {
    return source.replace(/asset:([a-zA-Z0-9_./-]+)/g, (_, name: string) => {
      if (!/^(drafts|published)\//.test(name) || name.split('/').includes('..'))
        throw new Error(`${entry.file}: invalid asset reference ${name}`);
      if (entry.article.status === 'published' && name.startsWith('drafts/'))
        throw new Error(`${entry.file}: a published article cannot reference draft assets`);
      const file = path.join(root, 'assets', name);
      const bytes = readFileSync(file);
      const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 20);
      const url = `/editorial-assets/${hash}-${path.basename(file)}`;
      assets.set(url, { file, url });
      return url;
    });
  }
  return {
    ...entry,
    body: replace(entry.body),
    article: JSON.parse(replace(JSON.stringify(entry.article))) as Article,
  };
}
