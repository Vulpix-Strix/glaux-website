import { createRootRoute, HeadContent, Outlet, Scripts, useParams } from '@tanstack/react-router';
import * as React from 'react';
import appCss from '@/styles/app.css?url';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';
import { siteI18nProvider } from '@/lib/fumadocs-i18n';
import { baseLocale, isLocale } from '@/paraglide/runtime';

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
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  // Reading the route param subscribes the root to navigation, so `<html lang>` follows client-side
  // transitions as well as direct loads.
  const params = useParams({ strict: false });
  const lang = isLocale(params.lang) ? params.lang : baseLocale;

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider i18n={siteI18nProvider(lang)}>
          <Outlet />
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
