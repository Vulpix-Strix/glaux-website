import type { LandingLanguage } from '@/lib/i18n';
import { landingCopy } from '@/lib/landing/copy';
import { repositoryUrl } from '@/lib/landing/navigation';
import { CartridgeGallery } from './cartridge-gallery';
import { ConsoleOverview, MachineFacts } from './console-overview';
import { DownloadOptions } from './download-options';
import { LearningResources } from './learning-resources';
import { LandingFooter, LandingHeader } from './navigation';
import { Action, CodeBlock, PixelImage, SectionHeading } from './primitives';
import { WorkspacePreview } from './workspace-preview';

export function LandingPage({ lang }: { lang: LandingLanguage }) {
  const copy = landingCopy[lang];
  return (
    <div className="glaux-landing" id="top">
      <a className="gx-skip" href="#main">{copy.skip}</a>
      <LandingHeader copy={copy} lang={lang} />
      <main id="main" tabIndex={-1}>
        <section className="gx-hero" aria-labelledby="hero-title">
          <div className="gx-wrap gx-hero-grid">
            <div>
              <p className="gx-eyebrow">{copy.hero.eyebrow}</p>
              <h1 id="hero-title">{copy.hero.title}</h1>
              <p className="gx-lead">{copy.hero.lead}</p>
              <div className="gx-actions">
                <Action href="#download" primary large>{copy.hero.cta}</Action>
                <Action href="/en/docs/guide" large hrefLang="en">{copy.hero.docs}</Action>
              </div>
              {lang === 'es' && <p className="gx-small gx-docs-note">{copy.learn.docsNote}</p>}
              <div className="gx-hero-terminal">
                <CodeBlock code={'> new my-game\n> run'} label="new my-game / run" terminal />
              </div>
              <p className="gx-small">{copy.hero.note}</p>
            </div>
            <figure className="gx-hero-shot">
              <div className="gx-frame">
                <PixelImage file="signal-lost-gameplay.png" alt={copy.alt.gameplay} width={320} height={240} pending={copy.missing} priority />
              </div>
              <div className="gx-hero-shell">
                <PixelImage file="glaux-shell.png" alt={copy.alt.shell} width={320} height={240} pending={copy.missing} priority />
              </div>
              <figcaption>{copy.hero.caption}</figcaption>
            </figure>
          </div>
        </section>
        <MachineFacts descriptions={copy.facts} label={copy.factsLabel} />
        <ConsoleOverview copy={copy.features} />
        <WorkspacePreview copy={copy.create} alt={copy.alt} pending={copy.missing} />
        <CartridgeGallery copy={copy.games} alt={copy.alt} pending={copy.missing} />
        <LearningResources copy={copy.learn} />
        <section className="gx-section" id="news">
          <div className="gx-wrap">
            <SectionHeading eyebrow={copy.news.eyebrow} title={copy.news.title} />
            <div className="gx-news-empty">
              <h3>{copy.news.empty}</h3>
              <p>{copy.news.text}</p>
              <Action href={repositoryUrl}>{copy.news.link}</Action>
            </div>
          </div>
        </section>
        <DownloadOptions copy={copy.get} />
      </main>
      <LandingFooter copy={copy} lang={lang} />
    </div>
  );
}
