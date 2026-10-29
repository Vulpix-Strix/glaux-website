import { useSurfaceTheme } from '@/components/site/use-surface-theme';
import { Container } from '@/components/site/primitives';
import { useEffect, useState } from 'react';
import { SiteThemeSwitch } from '@/components/site/theme-switch';
import type { LandingLanguage } from '@/lib/i18n';
import { landingCopy } from '@/lib/landing/copy';
import { creditsCopy } from '@/lib/credits/copy';
import type { EditorialFile } from '@/lib/credits/data';
import { SiteFooter, SiteHeader } from '@/components/landing/navigation';
import { Libraries } from './libraries';
import { People } from './people';
import { Resources } from './resources';

const PAGE = '/credits';
const sections = ['people', 'resources', 'libraries'] as const;

export function CreditsPage({
  lang,
  editorial,
}: {
  lang: LandingLanguage;
  editorial: EditorialFile;
}) {
  useSurfaceTheme();
  const site = landingCopy[lang];
  const copy = creditsCopy[lang];
  const current = useCurrentSection();
  return (
    <div className="glaux-theme gx-credits" id="top">
      <a className="gx-skip" href="#main">
        {site.skip}
      </a>
      <SiteHeader copy={site} lang={lang} page={PAGE}>
        <SiteThemeSwitch />
      </SiteHeader>
      <main id="main" tabIndex={-1}>
        <section className="gx-hero" aria-labelledby="credits-title">
          <Container className="gx-wrap gx-hero-grid relative grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-center gap-16 max-[1100px]:gap-8 max-[900px]:grid-cols-1 max-[900px]:gap-16 max-[600px]:gap-12">
            <div>
              <nav className="gx-credits-crumbs" aria-label={copy.breadcrumb}>
                <ol>
                  <li>
                    <a href={`/${lang}`}>Glaux</a>
                  </li>
                  <li aria-current="page">{copy.hero.title}</li>
                </ol>
              </nav>
              <h1 id="credits-title">{copy.hero.title}</h1>
              <p className="gx-lead">{copy.hero.lead}</p>
            </div>
            <CreditsRoll sections={editorial.sections} caption={copy.hero.figure} />
          </Container>
        </section>
        <nav className="gx-credits-anchors" aria-label={copy.nav.label}>
          <Container className="gx-wrap">
            {sections.map((id) => (
              <a key={id} href={`#${id}`} aria-current={current === id ? 'location' : undefined}>
                {copy.nav[id]}
              </a>
            ))}
          </Container>
        </nav>
        <People sections={editorial.sections} copy={copy.people} />
        <Resources art={editorial.art} copy={copy.resources} libraries={copy.libraries} />
        <Libraries copy={copy.libraries} />
      </main>
      <SiteFooter copy={site} lang={lang} page={PAGE} />
    </div>
  );
}

function CreditsRoll({
  sections,
  caption,
}: {
  sections: EditorialFile['sections'];
  caption: string;
}) {
  const label = sections
    .map(
      (section) =>
        `${section.title}: ${section.items.map((item) => (item.type === 'message' ? item.text : `${item.role}, ${item.name}`)).join('. ')}`,
    )
    .join('. ');
  return (
    <figure className="gx-credits-figure">
      <div className="gx-frame">
        <div className="gx-credits-roll" role="img" aria-label={label}>
          {sections.map((section) => (
            <div key={section.title} aria-hidden="true">
              <p className="gx-credits-roll-title">{section.title}</p>
              {section.items.map((item) =>
                item.type === 'message' ? (
                  <p className="gx-credits-roll-message" key={item.text}>
                    {item.text}
                  </p>
                ) : (
                  <p className="gx-credits-roll-line" key={`${item.role}/${item.name}`}>
                    <span>{item.role}</span>
                    <i />
                    <span>{item.name}</span>
                  </p>
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function useCurrentSection() {
  const [current, setCurrent] = useState<string>();
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length) setCurrent(visible[visible.length - 1].target.id);
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    for (const id of sections) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);
  return current;
}
