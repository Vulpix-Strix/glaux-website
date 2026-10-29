import type { ReactNode } from 'react';
import { SiteThemeSwitch } from '@/components/site/theme-switch';
import type { Locale } from '@/paraglide/runtime';
import { m } from '@/paraglide/messages';
import { SiteFooter, SiteHeader } from '@/components/landing/navigation';
import { useSurfaceTheme } from '@/components/site/use-surface-theme';
export function EditorialShell({
  lang,
  page,
  children,
  languagePaths,
}: {
  lang: Locale;
  page: string;
  children: ReactNode;
  languagePaths?: Partial<Record<Locale, string>>;
}) {
  useSurfaceTheme();
  return (
    <div
      className="glaux-theme gx-editorial min-h-screen w-full min-w-0 bg-gx-bg font-gx-sans text-base leading-relaxed text-gx-text antialiased"
      id="top"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-gx-accent focus:p-3 focus:text-gx-on-accent"
      >
        {m.landing_skip()}
      </a>
      <SiteHeader lang={lang} page={page} languagePaths={languagePaths}>
        <SiteThemeSwitch />
      </SiteHeader>
      {children}
      <SiteFooter lang={lang} page={page} />
    </div>
  );
}
