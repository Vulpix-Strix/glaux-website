import { assert, expect, test } from 'vitest';
import path from 'node:path';
import { build } from 'vite';
import { editorialPlugin } from '@/lib/editorial/vite';
import { tempDir, writeTree, root } from './helpers.ts';

test('the production MDX pipeline compiles published articles and emits only their assets', async () => {
  const dir = writeTree(tempDir(), {
    'en/news/public.mdx':
      '---\nid: fixture\ntitle: Public fixture\ndescription: Build test\nstatus: published\ndate: 2000-01-01\ncategories: [announcements]\n---\n\n## Public heading\n\n![Test](asset:published/public.png)\n\n<Metric label="Test" value={2} />\n',
    'en/blog/private.mdx':
      '---\nid: private\ntitle: PRIVATE_CONTENT_SENTINEL\ndescription: Not public\nstatus: draft\ncategories: [devlog]\n---\n\n![Private](asset:drafts/private.png)\n',
    'assets/published/public.png': 'PUBLIC_RESOURCE_SENTINEL',
    'assets/drafts/private.png': 'PRIVATE_RESOURCE_SENTINEL',
  });
  const workspace = writeTree(tempDir(), {
    'entry.ts': "export { articles, articleModules } from 'virtual:editorial';\n",
  });
  const result = await build({
    root,
    configFile: false,
    plugins: [editorialPlugin(dir)],
    logLevel: 'silent',
    build: {
      ssr: path.join(workspace, 'entry.ts'),
      write: false,
      emitAssets: true,
      target: 'esnext',
      minify: false,
    },
  });
  assert(!Array.isArray(result) && 'output' in result);
  const output = result.output
    .map((item) => (item.type === 'chunk' ? item.code : String(item.source)))
    .join('\n');
  expect(output).toMatch(/Public fixture/);
  expect(output).toMatch(/public-heading/);
  expect(output).toMatch(/PUBLIC_RESOURCE_SENTINEL/);
  expect(output).not.toMatch(/PRIVATE_CONTENT_SENTINEL|PRIVATE_RESOURCE_SENTINEL|private\.png|private\.mdx/);
  const assets = result.output.filter((item) => item.type === 'asset');
  expect(assets.length).toBe(1);
  expect(assets[0].fileName).toMatch(/^editorial-assets\/[a-f0-9]+-public.png$/);
});
