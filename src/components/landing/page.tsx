import { Container } from '@/components/site/primitives';
import type { LandingLanguage } from '@/lib/i18n';
import { landingCopy } from '@/lib/landing/copy';
import { repositoryUrl } from '@/lib/landing/navigation';
import { CartridgeGallery } from './cartridge-gallery';
import { ConsoleOverview, MachineFacts } from './console-overview';
import { DownloadOptions } from './download-options';
import { LearningResources } from './learning-resources';
import { SiteFooter, SiteHeader } from './navigation';
import { Action, CodeBlock, PixelImage, SectionHeading } from './primitives';
import { WorkspacePreview } from './workspace-preview';
import { articles } from 'virtual:editorial';
import { articlesFor } from '@/lib/editorial/catalog';
import { ArticleCard } from '@/components/editorial/cards';

export function LandingPage({ lang }: { lang: LandingLanguage }) {
  const copy = landingCopy[lang];
  const latestNews = articlesFor(articles, lang, 'news').slice(0, 3);
  return (
    <div className="glaux-landing" id="top">
      <a className="gx-skip" href="#main">
        {copy.skip}
      </a>
      <SiteHeader copy={copy} lang={lang} />
      <main id="main" tabIndex={-1}>
        <section className="gx-hero" aria-labelledby="hero-title">
          <Container className="gx-wrap gx-hero-grid relative grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-center gap-16 max-[1100px]:gap-8 max-[900px]:grid-cols-1 max-[900px]:gap-16 max-[600px]:gap-12">
            <div>
              <p className="gx-eyebrow">{copy.hero.eyebrow}</p>
              <h1 id="hero-title">{copy.hero.title}</h1>
              <p className="gx-lead">{copy.hero.lead}</p>
              <div className="gx-actions mt-8 flex flex-wrap items-center gap-3">
                <Action href="#download" primary large>
                  {copy.hero.cta}
                </Action>
                <Action href="/en/docs/guide" large hrefLang="en">
                  {copy.hero.docs}
                </Action>
              </div>
              {lang === 'es' && <p className="gx-small gx-docs-note">{copy.learn.docsNote}</p>}
              <div className="gx-hero-terminal mt-8 mb-3 max-w-90">
                <CodeBlock code={'> new my-game\n> run'} label="new my-game / run" terminal />
              </div>
              <p className="gx-small">{copy.hero.note}</p>
            </div>
            <figure className="gx-hero-shot relative min-w-0">
              <div className="gx-frame">
                <PixelImage
                  file="signal-lost-gameplay.png"
                  alt={copy.alt.gameplay}
                  width={320}
                  height={240}
                  pending={copy.missing}
                  priority
                />
              </div>
              <div className="gx-hero-shell">
                <PixelImage
                  file="glaux-shell.png"
                  alt={copy.alt.shell}
                  width={320}
                  height={240}
                  pending={copy.missing}
                  priority
                />
              </div>
              <figcaption>{copy.hero.caption}</figcaption>
            </figure>
          </Container>
        </section>
        <MachineFacts descriptions={copy.facts} label={copy.factsLabel} />
        <ConsoleOverview copy={copy.features} />
        <WorkspacePreview copy={copy.create} alt={copy.alt} pending={copy.missing} />
        <CartridgeGallery copy={copy.games} alt={copy.alt} pending={copy.missing} />
        <LearningResources copy={copy.learn} />
        <section className="gx-section" id="news">
          <Container className="gx-wrap">
            <SectionHeading eyebrow={copy.news.eyebrow} title={copy.news.title} />
            {latestNews.length ? (
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {latestNews.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <div className="gx-news-empty mt-8 rounded-lg border border-dashed border-gx-border-strong bg-gx-surface p-10 max-[600px]:p-6">
                <h3>{copy.news.empty}</h3>
                <p>{copy.news.text}</p>
                <div className="mt-6">
                  <Action href={repositoryUrl}>{copy.news.link}</Action>
                </div>
              </div>
            )}
            <div className="mt-6">
              <Action href={`/${lang}/news`}>
                {lang === 'es' ? 'Ver noticias' : 'Browse news'}
              </Action>
            </div>
          </Container>
        </section>
        <DownloadOptions copy={copy.get} />
      </main>
      <SiteFooter copy={copy} lang={lang} />
    </div>
  );
}
