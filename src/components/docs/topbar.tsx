import type { ComponentProps } from 'react';
import { useParams } from '@tanstack/react-router';
import { useDocsLayout } from 'fumadocs-ui/layouts/docs';
import { GitBranch, Menu } from 'lucide-react';
import { Wordmark } from '@/components/brand/wordmark';
import { LanguageLink } from '@/components/landing/navigation';
import { track } from '@/lib/posthog';
import { m } from '@/paraglide/messages';
import { downloadUrl, repositoryUrl, siteLinks } from '@/lib/site-nav';

/** The wordmark, as the layout's `navTitle`. Plain link: Fumadocs would mark it current on every page. */
export function HomeLink({ className, ...props }: ComponentProps<'a'>) {
  return (
    <a {...props} href="/en" aria-label={m.docs_home()} className={className ? `gx-docs-home ${className}` : 'gx-docs-home'}>
      <Wordmark />
    </a>
  );
}

/**
 * The site bar of the docs, installed through the layout's `header` slot.
 * Search, theme and the navigation drawer are Fumadocs' own controls.
 */
export function DocsTopbar(props: ComponentProps<'header'>) {
  const { slots } = useDocsLayout();
  const SidebarTrigger = slots.sidebar.trigger;
  const SearchTrigger = slots.searchTrigger ? slots.searchTrigger.sm : null;
  const ThemeSwitch = slots.themeSwitch || null;
  const NavTitle = slots.navTitle;
  // Within the manual, Docs opens the start of the version being read.
  const [version] = (useParams({ strict: false })._splat ?? '').split('/');

  return (
    <header id="nd-subnav" {...props} className="gx-docs-topbar">
      <div className="gx-docs-topbar-in">
        <SidebarTrigger className="gx-docs-iconbtn gx-docs-burger" aria-label={m.docs_open_menu()}>
          <Menu aria-hidden="true" />
        </SidebarTrigger>
        <NavTitle />
        <nav className="gx-docs-links" aria-label={m.docs_site_navigation()}>
          {siteLinks.map((link) =>
            link.href === undefined ? (
              <span key={link.id} className="gx-docs-planned" aria-disabled="true" title={m.docs_planned_title({ label: link.label() })}>
                {link.label()}
                <small>{m.docs_planned()}</small>
              </span>
            ) : link.id === 'docs' ? (
              <a key={link.id} href={`/en/docs/${version}`} aria-current="page">{link.label()}</a>
            ) : (
              <a key={link.id} href={link.href}>{link.label()}</a>
            ),
          )}
        </nav>
        <div className="gx-docs-end">
          {SearchTrigger && <SearchTrigger hideIfDisabled className="gx-docs-iconbtn gx-docs-topsearch" />}
          <div className="gx-docs-seg gx-docs-lang" role="group" aria-label={m.docs_site_language()}>
            <LanguageLink language="en" current="en" label="EN" />
            <LanguageLink language="es" current="en" label="ES" />
          </div>
          {ThemeSwitch && <ThemeSwitch />}
          <a
            className="gx-docs-iconbtn gx-docs-github"
            href={repositoryUrl}
            aria-label={m.docs_github()}
            onClick={() => track('github_clicked', { source: 'docs_topbar' })}
          >
            <GitBranch aria-hidden="true" />
          </a>
          <a className="gx-docs-download" href={downloadUrl} onClick={() => track('download_clicked', { source: 'docs_topbar' })}>
            {m.landing_download()}
          </a>
        </div>
      </div>
    </header>
  );
}

/** The bar's links for the navigation drawer, which replaces the bar's links on narrow screens. */
export function DrawerLinks() {
  return (
    <nav className="gx-docs-drawer-links" aria-label={m.docs_site_navigation()}>
      {siteLinks.map((link) =>
        link.href === undefined || link.id === 'docs' ? null : <a key={link.id} href={link.href}>{link.label()}</a>,
      )}
      <a href={downloadUrl} onClick={() => track('download_clicked', { source: 'docs_drawer' })}>
        {m.landing_download()}
      </a>
      <a href={repositoryUrl} onClick={() => track('github_clicked', { source: 'docs_drawer' })}>
        GitHub
      </a>
    </nav>
  );
}
