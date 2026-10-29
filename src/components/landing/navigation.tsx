import { useRef, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import type { Locale } from '@/paraglide/runtime';
import { m } from '@/paraglide/messages';
import { documentationLinks, landingNavigation, repositoryUrl } from '@/lib/landing/navigation';
import { Wordmark } from '@/components/brand/wordmark';
import { Button, Container } from '@/components/site/primitives';
import { track } from '@/lib/posthog';
import { Action } from './primitives';

export function LanguageLink({
  language,
  current,
  label,
  page = '',
  preserveHash = true,
}: {
  language: Locale;
  current: Locale;
  label: string;
  page?: string;
  preserveHash?: boolean;
}) {
  return (
    <a
      href={`/${language}${page}`}
      lang={language}
      hrefLang={language}
      aria-current={current === language ? 'page' : undefined}
      className="inline-grid min-h-11 min-w-11 place-items-center text-[13px] font-semibold text-gx-muted aria-current:bg-gx-accent-subtle aria-current:text-gx-text"
      onClick={(event) => {
        if (language !== current) track('language_changed', { from_language: current, to_language: language });
        event.currentTarget.href = `/${language}${page}${preserveHash ? window.location.hash : ''}`;
      }}
    >
      {label}
    </a>
  );
}
export function SiteHeader({
  lang,
  page = '',
  children,
  languagePaths,
}: {
  lang: Locale;
  page?: string;
  children?: ReactNode;
  languagePaths?: Partial<Record<Locale, string>>;
}) {
  const home = page ? `/${lang}` : '';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  return (
    <header
      className="border-b border-gx-border bg-gx-bg"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          setMenuOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <Container className="flex min-h-18 items-center gap-8 max-[1100px]:gap-4 max-[900px]:flex-wrap max-[900px]:py-3 max-[600px]:gap-3">
        <a href={`/${lang}`} aria-label={m.landing_home()}>
          <Wordmark />
        </a>
        <Button
          ref={menuButton}
          className="order-3 ml-auto min-[901px]:hidden!"
          aria-expanded={menuOpen}
          aria-controls="landing-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {m.landing_menu()}
        </Button>
        <nav
          id="landing-navigation"
          aria-label={m.landing_menu()}
          className={`mr-auto gap-1 max-[900px]:order-4 max-[900px]:w-full max-[900px]:flex-wrap ${menuOpen ? 'flex' : 'hidden min-[901px]:flex'}`}
        >
          {landingNavigation.map(({ id, href }) => (
            <a
              className="inline-flex min-h-11 items-center rounded-gx px-3 text-sm font-semibold text-gx-muted hover:bg-gx-raised hover:text-gx-text max-[1100px]:px-2 max-[600px]:min-h-12"
              href={id === 'news' ? `/${lang}/news` : `${home}${href}`}
              aria-current={id === 'news' && page.startsWith('/news') ? 'page' : undefined}
              key={id}
              onClick={() => setMenuOpen(false)}
            >
              {m[`landing_nav_${id}`]()}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4 max-[1100px]:gap-2 max-[600px]:[&>a]:hidden">
          <div
            className="flex rounded-gx border border-gx-border-strong"
            role="group"
            aria-label={m.landing_language()}
          >
            {(['en', 'es'] as const).map((language) =>
              languagePaths && !languagePaths[language] ? (
                <a
                  key={language}
                  href={`/${language}/${page.split('/')[1]}`}
                  title={m.editorial_unavailable()}
                  className="inline-grid min-h-11 min-w-11 place-items-center text-[13px] text-gx-muted"
                >
                  {language.toUpperCase()} *
                </a>
              ) : (
                <LanguageLink
                  key={language}
                  language={language}
                  current={lang}
                  label={language.toUpperCase()}
                  page={languagePaths?.[language] ?? page}
                  preserveHash={!languagePaths}
                />
              ),
            )}
          </div>
          {children}
          <Action href={`${home}#download`} primary onClick={() => track('download_clicked', { source: 'header' })}>
            {m.landing_download()}
          </Action>
        </div>
      </Container>
    </header>
  );
}
const footerNav =
  'flex flex-col items-start [&_h2]:mb-3 [&_h2]:font-gx-sans [&_h2]:text-xs [&_h2]:leading-4 [&_h2]:font-bold [&_h2]:tracking-[.08em] [&_h2]:text-gx-muted [&_h2]:uppercase [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:text-[15px] [&_a]:text-gx-text';
export function SiteFooter({
  lang,
  page = '',
}: {
  lang: Locale;
  page?: string;
}) {
  const home = page ? `/${lang}` : '';
  const otherLanguage = lang === 'en' ? 'es' : 'en';
  return (
    <footer className="border-t border-gx-border bg-gx-sunken pt-16 pb-10 [&_a:hover]:text-gx-accent [&_a:hover]:underline">
      <Container>
        <div className="grid grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] gap-8 max-[900px]:grid-cols-3 max-[600px]:grid-cols-2 max-[600px]:gap-6">
          <div className="max-[900px]:col-span-full">
            <a href={`${home}#top`} aria-label="glaux">
              <Wordmark />
            </a>
            <p className="mt-3 max-w-[32ch] text-sm leading-[22px] text-gx-muted">
              {m.landing_footer_tagline()}
            </p>
          </div>
          <nav className={footerNav} aria-label={m.landing_footer_learn()}>
            <h2>{m.landing_footer_learn()}</h2>
            <ul>
              {documentationLinks.map(({ id, slug }) => (
                <li key={id}>
                  <Link
                    to="/$lang/docs/$"
                    params={{ lang: 'en', _splat: slug }}
                    hrefLang="en"
                    onClick={() => track('docs_opened', { source: 'footer' })}
                  >
                    {m[`landing_learn_links_${id}_title`]()}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav className={footerNav} aria-label={m.landing_footer_project()}>
            <h2>{m.landing_footer_project()}</h2>
            <ul>
              <li>
                <a href={repositoryUrl} onClick={() => track('github_clicked', { source: 'footer' })}>
                  GitHub
                </a>
              </li>
              <li>
                <a href={`${repositoryUrl}/blob/main/LICENSE-MIT`}>MIT</a>
                {' / '}
                <a href={`${repositoryUrl}/blob/main/LICENSE-APACHE`}>Apache-2.0</a>
              </li>
              <li>
                <a
                  href={`/${lang}/credits`}
                  aria-current={page === '/credits' ? 'page' : undefined}
                >
                  {m.landing_footer_credits()}
                </a>
              </li>
            </ul>
          </nav>
          <nav className={footerNav} aria-label={m.landing_footer_site()}>
            <h2>{m.landing_footer_site()}</h2>
            <ul>
              <li>
                <a href={`${home}#download`} onClick={() => track('download_clicked', { source: 'footer' })}>
                  {m.landing_download()}
                </a>
              </li>
              <li>
                <a
                  href={`/${lang}/news`}
                  aria-current={page.startsWith('/news') ? 'page' : undefined}
                >
                  {m.editorial_news()}
                </a>
              </li>
              <li>
                <a
                  href={`/${lang}/blog`}
                  aria-current={page.startsWith('/blog') ? 'page' : undefined}
                >
                  {m.editorial_blog()}
                </a>
              </li>
              <li>
                <LanguageLink
                  language={otherLanguage}
                  current={lang}
                  label={otherLanguage === 'es' ? 'Español' : 'English'}
                  preserveHash={page.split('/').length <= 2}
                  page={page.split('/').length > 2 ? `/${page.split('/')[1]}` : page}
                />
              </li>
            </ul>
          </nav>
        </div>
        <div className="mt-12 flex flex-wrap justify-between gap-4 border-t border-gx-border pt-6 text-xs leading-5 text-gx-muted [&_a]:text-gx-accent">
          <span>glauxconsole.dev · {m.landing_footer_license()}</span>
          <span>
            {m.landing_footer_attribution()} <a href={`/${lang}/credits`}>{m.landing_footer_credits()}</a>
          </span>
        </div>
      </Container>
    </footer>
  );
}
