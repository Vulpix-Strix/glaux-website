// Runs a built site in Wrangler, locally and without deploying, for the smoke and integration tests.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

export interface LocalWorker {
  origin: string;
  /** Fetches `path` without following redirects and asserts its status. */
  request(path: string, status?: number, init?: RequestInit): Promise<Response>;
  /** What Wrangler printed, to explain a failure. */
  output(): string;
  stop(): Promise<void>;
}

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  return address.port;
}

/** Starts the Worker that `pnpm build` wrote below `root` and waits until it answers. */
export async function startWorker(root: string): Promise<LocalWorker> {
  const config = path.join(root, 'dist/server/wrangler.json');
  assert.ok(existsSync(config), 'run pnpm build first');
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const worker = spawn(
    process.execPath,
    [path.join(root, 'node_modules/wrangler/bin/wrangler.js'), 'dev', '--config', config, '--local', '--ip', '127.0.0.1', '--port', String(port)],
    { cwd: root, env: { ...process.env, WRANGLER_SEND_METRICS: 'false' }, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let output = '';
  worker.stdout.on('data', (data) => (output += data));
  worker.stderr.on('data', (data) => (output += data));

  const stop = async () => {
    if (worker.exitCode !== null || worker.signalCode !== null) return;
    const closed = new Promise<void>((resolve) => worker.once('close', () => resolve()));
    worker.kill('SIGTERM');
    await closed;
  };

  const deadline = Date.now() + 45000;
  while (true) {
    if (worker.exitCode !== null) throw new Error(`Worker exited: ${output}`);
    try {
      await fetch(`${origin}/en`, { signal: AbortSignal.timeout(1000) });
      break;
    } catch {
      if (Date.now() > deadline) {
        await stop();
        throw new Error(`Worker did not start: ${output}`);
      }
      await delay(250);
    }
  }

  async function request(pathname: string, status = 200, init?: RequestInit) {
    const response = await fetch(`${origin}${pathname}`, {
      ...init,
      headers: { Accept: 'text/html', ...Object.fromEntries(new Headers(init?.headers)) },
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(
      response.status,
      status,
      `${pathname} (${response.headers.get('location')}): ${(await response.clone().text()).slice(0, 500)}`,
    );
    return response;
  }

  return { origin, request, output: () => output, stop };
}
