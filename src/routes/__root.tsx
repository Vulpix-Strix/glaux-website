import { createRootRoute, HeadContent, Outlet, Scripts, useParams, useRouterState } from '@tanstack/react-router';
import * as React from 'react';
import appCss from '@/styles/app.css?url';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';
import { siteI18nProvider } from '@/lib/fumadocs-i18n';
import { baseLocale, isLocale } from '@/paraglide/runtime';
import { initializePostHog } from '@/lib/posthog';
import { searchVersion } from '@/lib/docs/catalog';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Glaux',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  React.useEffect(initializePostHog, []);

  // Reading the route param subscribes the root to navigation, so `<html lang>` follows client-side
  // transitions as well as direct loads.
  const params = useParams({ strict: false });
  const lang = isLocale(params.lang) ? params.lang : baseLocale;
  // Search stays within the version of the manual page, so its results never lead to another one.
  const version = useRouterState({ select: (state) => searchVersion(state.location.pathname) });

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider i18n={siteI18nProvider(lang)} search={{ options: { defaultTag: version, allowClear: false } }}>
          <Outlet />
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
