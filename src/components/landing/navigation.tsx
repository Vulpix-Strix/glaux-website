import { useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { LandingLanguage } from '@/lib/i18n';
import type { LandingCopy } from '@/lib/landing/copy';
import { documentationLinks, landingNavigation, repositoryUrl } from '@/lib/landing/navigation';
import { Action } from './primitives';

export function LanguageLink({ language, current, label }: {
  language: LandingLanguage;
  current: LandingLanguage;
  label: string;
}) {
  return (
    <a
      href={`/${language}`}
      lang={language}
      hrefLang={language}
      aria-current={current === language ? 'page' : undefined}
      onClick={(event) => {
        event.currentTarget.href = `/${language}${window.location.hash}`;
      }}
    >
      {label}
    </a>
  );
}

export function LandingHeader({ copy, lang }: { copy: LandingCopy; lang: LandingLanguage }) {
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
        <a className="gx-wordmark" href={`/${lang}`} aria-label={copy.home}>
          glaux<span aria-hidden="true" />
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
            <a href={href} key={id} onClick={() => setMenuOpen(false)}>{copy.nav[id]}</a>
          ))}
        </nav>
        <div className="gx-nav-end">
          <div className="gx-language" role="group" aria-label={copy.language}>
            <LanguageLink language="en" current={lang} label="EN" />
            <LanguageLink language="es" current={lang} label="ES" />
          </div>
          <Action href="#download" primary>{copy.download}</Action>
        </div>
      </div>
    </header>
  );
}

export function LandingFooter({ copy, lang }: { copy: LandingCopy; lang: LandingLanguage }) {
  const otherLanguage = lang === 'en' ? 'es' : 'en';
  return (
    <footer className="gx-footer">
      <div className="gx-wrap">
        <div className="gx-footer-grid">
          <div>
            <a className="gx-wordmark" href="#top">glaux<span aria-hidden="true" /></a>
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
              <li><a href="#credits">{copy.footer.credits}</a></li>
            </ul>
          </nav>
          <nav aria-label={copy.footer.site}>
            <h2>{copy.footer.site}</h2>
            <ul>
              <li><a href="#download">{copy.download}</a></li>
              <li><a href="#news">{copy.news.eyebrow}</a></li>
              <li>
                <LanguageLink language={otherLanguage} current={lang} label={otherLanguage === 'es' ? 'Español' : 'English'} />
              </li>
            </ul>
          </nav>
        </div>
        <div className="gx-footer-base" id="credits">
          <span>glauxconsole.dev · {copy.footer.license}</span>
          <span>{copy.footer.attribution} <a href="/ASSET-CREDITS.txt">{copy.footer.credits}</a></span>
        </div>
      </div>
    </footer>
  );
}
