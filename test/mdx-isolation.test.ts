import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { assert, expect, test } from 'vitest';
import { build, type Plugin } from 'vite';
import defineConfig from '../vite.config.ts';
import { root } from './helpers.ts';

test('the actual Vite MDX plugins compile independent content without a Glaux manifest', async () => {
  const cache = path.join(root, '.cache');
  mkdirSync(cache, { recursive: true });
  const dir = mkdtempSync(path.join(cache, 'mdx-isolation-'));
  try {
    const content = path.join(dir, 'content');
    mkdirSync(content);
    writeFileSync(path.join(content, 'article.mdx'), '---\ntitle: Independent article\n---\n\n## snake_case\n\nIndependent content.\n');
    const entry = path.join(dir, 'source.ts');
    writeFileSync(entry, `import { defineDocs } from 'fumadocs-mdx/macro';\nexport const editorial = defineDocs({ dir: ${JSON.stringify(content)} });\n`);
    const config = defineConfig({ command: 'build', mode: 'production' });
    const plugins = ((config.plugins ?? []) as unknown[]).flat(Infinity) as Plugin[];
    const mdxPlugins = plugins.filter((plugin) => plugin && typeof plugin === 'object' && plugin.name?.startsWith('fumadocs-mdx'));
    expect(mdxPlugins.length > 0).toBeTruthy();
    const result = await build({
      configFile: false, root, plugins: mdxPlugins, logLevel: 'silent',
      build: { ssr: entry, write: false, target: 'esnext', minify: false },
    });
    assert(!Array.isArray(result) && 'output' in result);
    const code = result.output.flatMap((item) => item.type === 'chunk' ? [item.code] : []).join('\n');
    expect(code).toMatch(/id:\s*"snake_case"/);
    expect(code).not.toMatch(/id:\s*"snake-case"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
