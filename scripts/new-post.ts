// Usage: pnpm new:post --title "My article" [--lang es|en|both] [--section blog|news] [--id my-article]
// Creates a draft in content/editorial. Defaults: Spanish, blog. The title is asked for when missing.
import { createInterface } from 'node:readline/promises';
import path from 'node:path';
import { createPost, type NewPost } from '../src/lib/editorial/scaffold.ts';

const root = path.join(import.meta.dirname, '../content/editorial');

function option(args: string[], name: string): string | undefined {
  const inline = args.find((arg) => arg.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
}

async function ask(question: string): Promise<string> {
  if (!process.stdin.isTTY) throw new Error('Pass --title when not running in a terminal');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

try {
  const args = process.argv.slice(2);
  const title = option(args, 'title') ?? (await ask('Title: '));
  const files = createPost(root, {
    title,
    lang: option(args, 'lang') as NewPost['lang'],
    section: option(args, 'section') as NewPost['section'],
    id: option(args, 'id'),
  });
  for (const file of files) console.log(`Created ${path.relative(process.cwd(), file)}`);
  console.log('Fill in the description, then write. Images go in content/editorial/assets/<id>/.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
