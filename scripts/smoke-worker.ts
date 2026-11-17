// Run after `pnpm build`: validate the built artifact in Wrangler, without deploying.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { pngSize } from '../src/lib/og/png.ts';
import { startWorker } from './worker.ts';

assert.ok(existsSync('dist/server/wrangler.json'), 'run pnpm build first');
const worker = await startWorker(process.cwd());
const { origin, request } = worker;

try {
  const redirect = await request('/', 307);
  assert.equal(new URL(redirect.headers.get('location')!, origin).pathname, '/en');
  // Landings can be prerendered; verify their generated HTML and the live Worker endpoints.
  const home = await (await request('/en')).text();
  assert.match(home, /<html[^>]*lang="en"/);
  assert.match(home, /Build small worlds/);
  const spanish = await (await request('/es')).text();
  assert.match(spanish, /<html[^>]*lang="es"/);
  assert.match(spanish, /Crea pequeños mundos/);
  for (const [lang, html] of [
    ['en', home],
    ['es', spanish],
  ]) {
    assert.match(html, new RegExp(`https://glauxconsole.dev/${lang}`));
    assert.match(html, /href="\/en\/docs\/guide\/getting-started"/);
    assert.match(html, /href="\/en\/docs\/guide\/game-loop"/);
    assert.match(html, /href="\/en\/docs\/api"/);
    assert.match(html, /signal-lost-gameplay.png/);
    assert.doesNotMatch(html, /href="#"/);
    assert.doesNotMatch(html, /\[FILE TYPE|\[POST|proof of concept/);
  }
  for (const [lang, title] of [
    ['en', /Credits — Glaux/],
    ['es', /Créditos — Glaux/],
  ] as const) {
    const credits = await (await request(`/${lang}/credits`)).text();
    assert.match(credits, title);
    assert.match(credits, new RegExp(`https://glauxconsole.dev/${lang}/credits`));
    assert.match(credits, /Cuervolu/);
  }
  for (const lang of ['en', 'es']) {
    for (const section of ['news', 'blog']) {
      const html = await (await request(`/${lang}/${section}`)).text();
      assert.match(html, new RegExp(`<html[^>]*lang="${lang}"`));
      assert.match(html, new RegExp(`https://glauxconsole.dev/${lang}/${section}`));
      assert.doesNotMatch(html, /Sample content|component-demo|Development preview/);
      assert.match(html, new RegExp(`href="/${lang}/blog"`));
      const filtered = await (
        await request(`/${lang}/${section}?q=term-with-no-editorial-matches`)
      ).text();
      assert.match(
        filtered,
        lang === 'es'
          ? /No hay artículos que coincidan|Todavía no hay artículos/
          : /No articles match|No articles published/,
      );
      const feed = await request(`/${lang}/${section}/rss.xml`);
      assert.match(feed.headers.get('content-type')!, /application\/rss\+xml/);
      assert.match(await feed.text(), /<rss version="2.0">/);
    }
    await request(`/${lang}/blog/component-demo`, 404);
    await request(`/${lang}/news/missing`, 404);
  }
  const { loadContent, resolveContentAssets } = await import('../src/lib/editorial/content.ts');
  const { resolve } = await import('node:path');
  const root = resolve('content/editorial');
  const publicAssets = new Map();
  for (const entry of loadContent(root, false)) {
    resolveContentAssets(entry, root, publicAssets);
    const { article } = entry;
    const url = `/${article.lang}/${article.section}/${article.slug}`;
    const html = await (await request(url)).text();
    assert.match(html, /id="article-body"/);
    assert.match(html, /property="og:type" content="article"/);
    assert.ok(html.includes(`https://glauxconsole.dev${url}`), `${url}: canonical`);
    assert.doesNotMatch(
      html,
      /Switched to client rendering|Something went wrong|PRIVATE_CONTENT_SENTINEL/,
    );
  }
  // Everything a published article references, including a custom ogImage, is served.
  for (const url of publicAssets.keys()) await request(url);
  // Assets used only by drafts are not, but one shared with a published article is public.
  const draftAssets = new Map();
  for (const entry of loadContent(root, true).filter((entry) => entry.article.status === 'draft'))
    resolveContentAssets(entry, root, draftAssets);
  for (const url of draftAssets.keys()) if (!publicAssets.has(url)) await request(url, 404);
  for (const path of [
    '/content/editorial/assets/component-demo/demo.mp4',
    '/editorial-assets/component-demo/demo.mp4',
    '/fr/blog',
  ])
    await request(path, 404);
  for (const path of [
    '/fonts/pixel-code-regular.woff2',
    '/images/landing/signal-lost-sprites.png',
    '/images/landing/icons/code.png',
    '/ASSET-CREDITS.txt',
    '/credits/editorial.json',
  ])
    await request(path);
  const { readCatalog } = await import('../src/lib/glaux/versions.ts');
  const catalog = readCatalog(resolve('content/glaux'));
  const version = catalog.default;
  const docsBase = `/en/docs/${version}`;
  const stable = catalog.versions.find((v) => v.kind === 'release')?.id ?? version;
  // URLs without a version, `stable` and version roots redirect once to a page that exists.
  for (const [from, to] of [
    ['/en/docs/guide', `${docsBase}/guide`],
    ['/en/docs/guide/getting-started', `${docsBase}/guide/getting-started`],
    ['/en/docs/stable/guide', `/en/docs/${stable}/guide`],
    ['/en/docs', `${docsBase}/guide`],
    [docsBase, `${docsBase}/guide`],
    ['/en/docs/guide.md', `${docsBase}/guide.md`],
  ]) {
    const moved = await request(from, 307);
    const location = new URL(moved.headers.get('location')!, origin).pathname;
    assert.equal(location, to, from);
    await request(location);
  }
  const docsResponse = await request(`${docsBase}/guide`);
  assert.match(docsResponse.headers.get('vary')!, /Accept/i);
  const head = await request(`${docsBase}/guide`, 200, { method: 'HEAD' });
  assert.equal(await head.text(), '');
  const docs = await docsResponse.text();
  assert.ok(docs.includes(`https://glauxconsole.dev${docsBase}/guide`), 'canonical names the version');
  assert.match(docs, /<title>.*Glaux<\/title>/);
  assert.match(docs, /id="gx-version-select"/);
  for (const [, link] of docs.matchAll(/href="\/en\/docs\/([^"/#]*)/g)) {
    assert.equal(link, version, 'every manual link stays in the version');
  }
  const asset = docs.match(/(?:src|href)="(\/assets\/[^"?]+\.(?:js|css))"/);
  assert.ok(asset, 'HTML links to bundled assets');
  await request(asset[1]);
  const markdown = await request(`${docsBase}/guide.md`);
  assert.match(markdown.headers.get('content-type')!, /text\/markdown/);
  assert.match(await markdown.text(), /^# /);
  const negotiated = await request(`${docsBase}/guide`, 307, { headers: { Accept: 'text/markdown' } });
  assert.equal(new URL(negotiated.headers.get('location')!, origin).pathname, `${docsBase}/guide.md`);
  assert.match(negotiated.headers.get('vary')!, /Accept/i);
  for (const query of ['', `&tag=${version}`]) {
    const search = await (await request(`/api/search?query=game&locale=en${query}`)).json();
    assert.ok(Array.isArray(search) && search.length > 0, 'search returns real documentation results');
    assert.ok(search.every((hit: { url: string }) => hit.url.startsWith(`${docsBase}/`)), 'search stays in the version');
  }
  await request('/api/search?query=game&locale=en&tag=v9.9.9', 400);
  for (const path of ['/llms.txt', '/llms-full.txt']) {
    assert.match(await (await request(path)).text(), /Glaux|Guide|guide/);
  }
  const sitemap = await (await request('/sitemap.xml')).text();
  assert.ok(sitemap.includes(`<loc>https://glauxconsole.dev${docsBase}/guide</loc>`));
  assert.doesNotMatch(sitemap, /\/docs\/(stable\/|guide)/, 'the sitemap has no redirecting URLs');
  const og = await request(`/en/og/${version}/guide/image.webp`);
  assert.match(og.headers.get('content-type')!, /image\/webp/);
  const bytes = new Uint8Array(await og.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'RIFF');
  assert.ok(bytes.length > 1000);
  for (const path of ['/og/en/index.png', '/og/es/news.png', `/og/en/docs/${version}/guide.png`]) {
    const card = await request(path);
    assert.match(card.headers.get('content-type')!, /image\/png/);
    const png = new Uint8Array(await card.arrayBuffer());
    assert.deepEqual(pngSize(png), { width: 1200, height: 630 }, path);
  }
  for (const path of [
    '/en/docs/missing',
    '/en/docs/v9.9.9/guide',
    `${docsBase}/missing`,
    '/og/en/missing.png',
    '/en/docs/missing.md',
    '/en/og/missing/image.webp',
    '/es/docs/guide',
    '/es/docs/guide.md',
    '/es/og/guide/image.webp',
    '/unknown',
  ]) {
    await request(path, 404);
  }
  console.log(
    'Worker smoke passed: EN/ES landings, versioned docs and redirects, assets, search, Markdown negotiation, LLM, sitemap, WebP and PNG OG and 404s.',
  );
} catch (error) {
  console.error(worker.output().slice(-10000));
  throw error;
} finally {
  await worker.stop();
}
