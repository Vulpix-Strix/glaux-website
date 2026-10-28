// Run after `pnpm build`: validate the built artifact in Wrangler, without deploying.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

assert.ok(existsSync('dist/server/wrangler.json'), 'run pnpm build first');
const portServer = createServer();
await new Promise<void>((resolve) => portServer.listen(0, '127.0.0.1', resolve));
const address = portServer.address();
assert.ok(address && typeof address !== 'string');
const port = address.port;
await new Promise<void>((resolve, reject) => portServer.close((error) => error ? reject(error) : resolve()));
const origin = `http://127.0.0.1:${port}`;
const worker = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev',
  '--config', 'dist/server/wrangler.json', '--local', '--ip', '127.0.0.1', '--port', String(port)], {
  env: { ...process.env, WRANGLER_SEND_METRICS: 'false' }, stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
worker.stdout.on('data', (data) => { output += data; });
worker.stderr.on('data', (data) => { output += data; });

async function request(path: string, status = 200, init?: RequestInit) {
  const response = await fetch(`${origin}${path}`, { ...init, headers: { Accept: 'text/html', ...Object.fromEntries(new Headers(init?.headers)) }, redirect: 'manual', signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, status, `${path} (${response.headers.get("location")}): ${(await response.clone().text()).slice(0, 500)}`);
  return response;
}

try {
  const deadline = Date.now() + 45000;
  while (true) {
    assert.equal(worker.exitCode, null, output);
    try {
      await fetch(`${origin}/en`, { signal: AbortSignal.timeout(1000) });
      break;
    } catch {
      if (Date.now() > deadline) throw new Error(`Worker did not start: ${output}`);
      await delay(250);
    }
  }
  const redirect = await request('/', 307);
  assert.equal(new URL(redirect.headers.get('location')!, origin).pathname, '/en');
  assert.equal(existsSync('dist/client/en/index.html'), false, '/en must exercise SSR, not a prerendered asset');
  const home = await (await request('/en')).text();
  assert.match(home, /<html[^>]*lang="en"/);
  assert.match(home, /Glaux documentation \(proof of concept\)/);
  const docsResponse = await request('/en/docs/guide');
  assert.match(docsResponse.headers.get('vary')!, /Accept/i);
  const head = await request('/en/docs/guide', 200, { method: 'HEAD' });
  assert.equal(await head.text(), '');
  const docs = await docsResponse.text();
  assert.match(docs, /https:\/\/glauxconsole.dev\/en\/docs\/guide/);
  assert.match(docs, /<title>.*Glaux<\/title>/);
  const asset = docs.match(/(?:src|href)="(\/assets\/[^"?]+\.(?:js|css))"/);
  assert.ok(asset, 'HTML links to bundled assets');
  await request(asset[1]);
  const markdown = await request('/en/docs/guide.md');
  assert.match(markdown.headers.get('content-type')!, /text\/markdown/);
  assert.match(await markdown.text(), /^# /);
  const negotiated = await request('/en/docs/guide', 307, { headers: { Accept: 'text/markdown' } });
  assert.equal(new URL(negotiated.headers.get('location')!, origin).pathname, '/en/docs/guide.md');
  assert.match(negotiated.headers.get('vary')!, /Accept/i);
  const search = await (await request('/api/search?query=game&locale=en')).json();
  assert.ok(Array.isArray(search) && search.length > 0, 'search returns real documentation results');
  for (const path of ['/llms.txt', '/llms-full.txt']) {
    assert.match(await (await request(path)).text(), /Glaux|Guide|guide/);
  }
  const og = await request('/en/og/guide/image.webp');
  assert.match(og.headers.get('content-type')!, /image\/webp/);
  const bytes = new Uint8Array(await og.arrayBuffer());
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'RIFF');
  assert.ok(bytes.length > 1000);
  for (const path of ['/en/docs/missing', '/en/docs/missing.md', '/en/og/missing/image.webp',
    '/es', '/es/docs/guide', '/es/docs/guide.md', '/es/og/guide/image.webp', '/unknown']) {
    await request(path, 404);
  }
  console.log('Worker smoke passed: SSR, docs, assets, search, Markdown negotiation, LLM, WebP OG and 404s.');
} catch (error) {
  console.error(output.slice(-10000));
  throw error;
} finally {
  if (worker.exitCode === null && worker.signalCode === null) {
    const closed = new Promise<void>((resolve) => worker.once('close', () => resolve()));
    worker.kill('SIGTERM');
    await closed;
  }
}
