import posthog from 'posthog-js';

type Language = 'en' | 'es';

/** Every event the site sends. Names are stable and independent of the UI language. */
export interface AnalyticsEvents {
  // No binaries are published yet, so there is no platform or version to report.
  download_clicked: { source: 'header' | 'hero' | 'footer' | 'docs_topbar' | 'docs_drawer' };
  github_clicked: {
    source:
      | 'footer'
      | 'docs_topbar'
      | 'docs_drawer'
      | 'news_empty'
      | 'download_source'
      | 'examples_gallery';
  };
  docs_opened: {
    source: 'hero' | 'features' | 'learn_guides' | 'learn_api' | 'footer' | 'editorial_listing';
  };
  article_shared: { article_type: 'news' | 'blog'; slug: string; method: 'copy_link' | 'email' };
  language_changed: { from_language: Language; to_language: Language };
  feature_interacted: { feature: 'script_language'; action: 'select_luau' | 'select_rhai' };
}

interface PostHogConfig {
  token: string;
  host: string;
}

/** Returns nothing when either variable is missing, which keeps PostHog disabled. */
export function readPostHogConfig(env: {
  VITE_PUBLIC_POSTHOG_PROJECT_TOKEN?: string;
  VITE_PUBLIC_POSTHOG_HOST?: string;
}): PostHogConfig | undefined {
  const token = env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
  const host = env.VITE_PUBLIC_POSTHOG_HOST?.trim();
  return token && host ? { token, host } : undefined;
}

let enabled = false;

/** Browser only. Safe to call more than once, and never throws. */
export function initializePostHog(): void {
  if (enabled || typeof window === 'undefined') return;
  const config = readPostHogConfig(import.meta.env);
  if (!config) return;
  try {
    posthog.init(config.token, {
      api_host: config.host,
      // Pageviews come from history changes, which covers TanStack Router's client navigation.
      capture_pageview: 'history_change',
      // Events are explicit. Nothing else is collected or loaded.
      autocapture: false,
      capture_dead_clicks: false,
      capture_heatmaps: false,
      rageclick: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_web_experiments: true,
      advanced_disable_flags: true,
      person_profiles: 'identified_only',
    });
    enabled = true;
  } catch {
    // Analytics must never affect the page.
  }
}

/**
 * Sends an event once. It does nothing during SSR, prerendering or without configuration.
 * `sendBeacon` lets events survive links that unload the page right after the click.
 */
export function track<E extends keyof AnalyticsEvents>(event: E, properties: AnalyticsEvents[E]): void {
  if (!enabled) return;
  try {
    posthog.capture(event, properties, { transport: 'sendBeacon' });
  } catch {
    // Analytics must never affect the page.
  }
}
