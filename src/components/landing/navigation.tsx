import { useRef, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import type { LandingLanguage } from '@/lib/i18n';
import type { LandingCopy } from '@/lib/landing/copy';
import { documentationLinks, landingNavigation, repositoryUrl } from '@/lib/landing/navigation';
import { Wordmark } from '@/components/brand/wordmark';
import { Action } from './primitives';

export function LanguageLink({ language, current, label, page = '' }: {
  language: LandingLanguage;
  current: LandingLanguage;
  label: string;
  /** Path below the language of the page being left, such as `/credits`. */
  page?: string;
}) {
  return (
    <a
      href={`/${language}${page}`}
      lang={language}
      hrefLang={language}
      aria-current={current === language ? 'page' : undefined}
      onClick={(event) => {
        event.currentTarget.href = `/${language}${page}${window.location.hash}`;
      }}
    >
      {label}
    </a>
  );
}

/**
 * The site bar. On the landing its links are anchors of the page; any other page passes its
 * own path so they lead back to the landing, and may add controls of its own as `children`.
 */
export function SiteHeader({ copy, lang, page = '', children }: {
  copy: LandingCopy;
  lang: LandingLanguage;
  page?: string;
  children?: ReactNode;
}) {
  const home = page ? `/${lang}` : '';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  return (
    <header
      className="gx-nav"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) {
          setMenuOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <div className="gx-wrap gx-nav-inner">
        <a href={`/${lang}`} aria-label={copy.home}>
          <Wordmark />
        </a>
        <button
          className="gx-menu gx-button"
          ref={menuButton}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="landing-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {copy.menu}
        </button>
        <nav
          id="landing-navigation"
          aria-label={copy.menu}
          className={`gx-nav-links${menuOpen ? ' is-open' : ''}`}
        >
          {landingNavigation.map(({ id, href }) => (
            <a href={`${home}${href}`} key={id} onClick={() => setMenuOpen(false)}>{copy.nav[id]}</a>
          ))}
        </nav>
        <div className="gx-nav-end">
          <div className="gx-language" role="group" aria-label={copy.language}>
            <LanguageLink language="en" current={lang} label="EN" page={page} />
            <LanguageLink language="es" current={lang} label="ES" page={page} />
          </div>
          {children}
          <Action href={`${home}#download`} primary>{copy.download}</Action>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ copy, lang, page = '' }: { copy: LandingCopy; lang: LandingLanguage; page?: string }) {
  const home = page ? `/${lang}` : '';
  const otherLanguage = lang === 'en' ? 'es' : 'en';
  return (
    <footer className="gx-footer">
      <div className="gx-wrap">
        <div className="gx-footer-grid">
          <div>
            <a href={`${home}#top`} aria-label="glaux"><Wordmark /></a>
            <p>{copy.footer.tagline}</p>
          </div>
          <nav aria-label={copy.footer.learn}>
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
          <nav aria-label={copy.footer.project}>
            <h2>{copy.footer.project}</h2>
            <ul>
              <li><a href={repositoryUrl}>GitHub</a></li>
              <li>
                <a href={`${repositoryUrl}/blob/main/LICENSE-MIT`}>MIT</a>
                {' / '}
                <a href={`${repositoryUrl}/blob/main/LICENSE-APACHE`}>Apache-2.0</a>
              </li>
              <li><a href={`/${lang}/credits`} aria-current={page === '/credits' ? 'page' : undefined}>{copy.footer.credits}</a></li>
            </ul>
          </nav>
          <nav aria-label={copy.footer.site}>
            <h2>{copy.footer.site}</h2>
            <ul>
              <li><a href={`${home}#download`}>{copy.download}</a></li>
              <li><a href={`${home}#news`}>{copy.news.eyebrow}</a></li>
              <li>
                <LanguageLink language={otherLanguage} current={lang} label={otherLanguage === 'es' ? 'Español' : 'English'} page={page} />
              </li>
            </ul>
          </nav>
        </div>
        <div className="gx-footer-base">
          <span>glauxconsole.dev · {copy.footer.license}</span>
          <span>{copy.footer.attribution} <a href={`/${lang}/credits`}>{copy.footer.credits}</a></span>
        </div>
      </div>
    </footer>
  );
}
