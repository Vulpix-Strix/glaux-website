import type { ReactNode } from 'react';
import { SiteThemeSwitch } from '@/components/site/theme-switch';
import type { LandingLanguage } from '@/lib/i18n';
import { landingCopy } from '@/lib/landing/copy';
import { SiteFooter, SiteHeader } from '@/components/landing/navigation';
import { useSurfaceTheme } from '@/components/site/use-surface-theme';
import { EditorialLanguage } from './context';
export function EditorialShell({
  lang,
  page,
  children,
  languagePaths,
}: {
  lang: LandingLanguage;
  page: string;
  children: ReactNode;
  languagePaths?: Partial<Record<LandingLanguage, string>>;
}) {
  useSurfaceTheme();
  return (
    <EditorialLanguage value={lang}>
      <div
        className="glaux-theme gx-editorial min-h-screen w-full min-w-0 bg-gx-bg font-gx-sans text-base leading-relaxed text-gx-text antialiased"
        id="top"
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-gx-accent focus:p-3 focus:text-gx-on-accent"
        >
          {landingCopy[lang].skip}
        </a>
        <SiteHeader copy={landingCopy[lang]} lang={lang} page={page} languagePaths={languagePaths}>
          <SiteThemeSwitch />
        </SiteHeader>
        {children}
        <SiteFooter copy={landingCopy[lang]} lang={lang} page={page} />
      </div>
    </EditorialLanguage>
  );
}
