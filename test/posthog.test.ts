import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const posthog = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn() }));
vi.mock('posthog-js', () => ({ default: posthog }));

const env = { VITE_PUBLIC_POSTHOG_PROJECT_TOKEN: 'test-token', VITE_PUBLIC_POSTHOG_HOST: 'https://ph.test' };

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test('PostHog stays disabled unless both variables are set', async () => {
  const { readPostHogConfig } = await import('@/lib/posthog');
  expect(readPostHogConfig(env)).toStrictEqual({ token: 'test-token', host: 'https://ph.test' });
  expect(readPostHogConfig({ VITE_PUBLIC_POSTHOG_HOST: 'https://ph.test' })).toBeUndefined();
  expect(readPostHogConfig({ VITE_PUBLIC_POSTHOG_PROJECT_TOKEN: 'test-token' })).toBeUndefined();
  expect(readPostHogConfig({ ...env, VITE_PUBLIC_POSTHOG_PROJECT_TOKEN: '  ' })).toBeUndefined();
});

test('nothing is initialized or sent during SSR', async () => {
  vi.stubEnv('VITE_PUBLIC_POSTHOG_PROJECT_TOKEN', env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN);
  vi.stubEnv('VITE_PUBLIC_POSTHOG_HOST', env.VITE_PUBLIC_POSTHOG_HOST);
  const { initializePostHog, track } = await import('@/lib/posthog');
  expect(typeof window).toBe('undefined');
  initializePostHog();
  track('download_clicked', { source: 'hero' });
  expect(posthog.init).not.toHaveBeenCalled();
  expect(posthog.capture).not.toHaveBeenCalled();
});

test('the browser without configuration neither initializes nor throws', async () => {
  vi.stubGlobal('window', {});
  vi.stubEnv('VITE_PUBLIC_POSTHOG_PROJECT_TOKEN', '');
  vi.stubEnv('VITE_PUBLIC_POSTHOG_HOST', '');
  const { initializePostHog, track } = await import('@/lib/posthog');
  expect(() => initializePostHog()).not.toThrow();
  expect(() => track('github_clicked', { source: 'footer' })).not.toThrow();
  expect(posthog.init).not.toHaveBeenCalled();
  expect(posthog.capture).not.toHaveBeenCalled();
});

test('initialization is explicit, once, and keeps pageviews only', async () => {
  vi.stubGlobal('window', {});
  vi.stubEnv('VITE_PUBLIC_POSTHOG_PROJECT_TOKEN', env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN);
  vi.stubEnv('VITE_PUBLIC_POSTHOG_HOST', env.VITE_PUBLIC_POSTHOG_HOST);
  const { initializePostHog } = await import('@/lib/posthog');
  initializePostHog();
  initializePostHog();
  expect(posthog.init).toHaveBeenCalledTimes(1);
  const [token, options] = posthog.init.mock.calls[0];
  expect(token).toBe('test-token');
  expect(options).toMatchObject({
    api_host: 'https://ph.test',
    capture_pageview: 'history_change',
    autocapture: false,
    disable_session_recording: true,
    person_profiles: 'identified_only',
  });
});

test('events are sent once with their own properties, and SDK failures are swallowed', async () => {
  vi.stubGlobal('window', {});
  vi.stubEnv('VITE_PUBLIC_POSTHOG_PROJECT_TOKEN', env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN);
  vi.stubEnv('VITE_PUBLIC_POSTHOG_HOST', env.VITE_PUBLIC_POSTHOG_HOST);
  const { initializePostHog, track } = await import('@/lib/posthog');
  initializePostHog();
  track('language_changed', { from_language: 'en', to_language: 'es' });
  expect(posthog.capture).toHaveBeenCalledTimes(1);
  expect(posthog.capture).toHaveBeenCalledWith(
    'language_changed',
    { from_language: 'en', to_language: 'es' },
    { transport: 'sendBeacon' },
  );
  posthog.capture.mockImplementationOnce(() => {
    throw new Error('sdk down');
  });
  expect(() => track('article_shared', { article_type: 'news', slug: 'a', method: 'email' })).not.toThrow();
});

test('a failing init leaves tracking disabled instead of throwing', async () => {
  vi.stubGlobal('window', {});
  vi.stubEnv('VITE_PUBLIC_POSTHOG_PROJECT_TOKEN', env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN);
  vi.stubEnv('VITE_PUBLIC_POSTHOG_HOST', env.VITE_PUBLIC_POSTHOG_HOST);
  posthog.init.mockImplementationOnce(() => {
    throw new Error('init failed');
  });
  const { initializePostHog, track } = await import('@/lib/posthog');
  expect(() => initializePostHog()).not.toThrow();
  track('download_clicked', { source: 'header' });
  expect(posthog.capture).not.toHaveBeenCalled();
});
