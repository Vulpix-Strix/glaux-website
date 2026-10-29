import { useRef, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import type { LandingLanguage } from '@/lib/i18n';
import type { LandingCopy } from '@/lib/landing/copy';
import { documentationLinks, landingNavigation, repositoryUrl } from '@/lib/landing/navigation';
import { editorialCopy } from '@/lib/editorial/copy';
import { Wordmark } from '@/components/brand/wordmark';
import { Button, Container } from '@/components/site/primitives';
import { Action } from './primitives';

export function LanguageLink({
  language,
  current,
  label,
  page = '',
  preserveHash = true,
}: {
  language: LandingLanguage;
  current: LandingLanguage;
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
        event.currentTarget.href = `/${language}${page}${preserveHash ? window.location.hash : ''}`;
      }}
    >
      {label}
    </a>
  );
}
export function SiteHeader({
  copy,
  lang,
  page = '',
  children,
  languagePaths,
}: {
  copy: LandingCopy;
  lang: LandingLanguage;
  page?: string;
  children?: ReactNode;
  languagePaths?: Partial<Record<LandingLanguage, string>>;
}) {
  const home = page ? `/${lang}` : '';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const editorial = editorialCopy[lang];
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
        <a href={`/${lang}`} aria-label={copy.home}>
          <Wordmark />
        </a>
        <Button
          ref={menuButton}
          className="order-3 ml-auto min-[901px]:hidden!"
          aria-expanded={menuOpen}
          aria-controls="landing-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {copy.menu}
        </Button>
        <nav
          id="landing-navigation"
          aria-label={copy.menu}
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
              {copy.nav[id]}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4 max-[1100px]:gap-2 max-[600px]:[&>a]:hidden">
          <div
            className="flex rounded-gx border border-gx-border-strong"
            role="group"
            aria-label={copy.language}
          >
            {(['en', 'es'] as const).map((language) =>
              languagePaths && !languagePaths[language] ? (
                <a
                  key={language}
                  href={`/${language}/${page.split('/')[1]}`}
                  title={editorial.unavailable}
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
          <Action href={`${home}#download`} primary>
            {copy.download}
          </Action>
        </div>
      </Container>
    </header>
  );
}
const footerNav =
  'flex flex-col items-start [&_h2]:mb-3 [&_h2]:font-gx-sans [&_h2]:text-xs [&_h2]:leading-4 [&_h2]:font-bold [&_h2]:tracking-[.08em] [&_h2]:text-gx-muted [&_h2]:uppercase [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:text-[15px] [&_a]:text-gx-text';
export function SiteFooter({
  copy,
  lang,
  page = '',
}: {
  copy: LandingCopy;
  lang: LandingLanguage;
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
              {copy.footer.tagline}
            </p>
          </div>
          <nav className={footerNav} aria-label={copy.footer.learn}>
            <h2>{copy.footer.learn}</h2>
            <ul>
              {documentationLinks.map(({ id, slug }) => (
                <li key={id}>
                  <Link to="/$lang/docs/$" params={{ lang: 'en', _splat: slug }} hrefLang="en">
                    {copy.learn.links[id].title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav className={footerNav} aria-label={copy.footer.project}>
            <h2>{copy.footer.project}</h2>
            <ul>
              <li>
                <a href={repositoryUrl}>GitHub</a>
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
                  {copy.footer.credits}
                </a>
              </li>
            </ul>
          </nav>
          <nav className={footerNav} aria-label={copy.footer.site}>
            <h2>{copy.footer.site}</h2>
            <ul>
              <li>
                <a href={`${home}#download`}>{copy.download}</a>
              </li>
              <li>
                <a
                  href={`/${lang}/news`}
                  aria-current={page.startsWith('/news') ? 'page' : undefined}
                >
                  {editorialCopy[lang].news}
                </a>
              </li>
              <li>
                <a
                  href={`/${lang}/blog`}
                  aria-current={page.startsWith('/blog') ? 'page' : undefined}
                >
                  Blog
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
          <span>glauxconsole.dev · {copy.footer.license}</span>
          <span>
            {copy.footer.attribution} <a href={`/${lang}/credits`}>{copy.footer.credits}</a>
          </span>
        </div>
      </Container>
    </footer>
  );
}
