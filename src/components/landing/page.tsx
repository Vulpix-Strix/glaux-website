import { Container } from '@/components/site/primitives';
import type { Locale } from '@/paraglide/runtime';
import { m } from '@/paraglide/messages';
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

export function LandingPage({ lang }: { lang: Locale }) {
  const latestNews = articlesFor(articles, lang, 'news').slice(0, 3);
  return (
    <div className="glaux-landing" id="top">
      <a className="gx-skip" href="#main">
        {m.landing_skip()}
      </a>
      <SiteHeader lang={lang} />
      <main id="main" tabIndex={-1}>
        <section className="gx-hero" aria-labelledby="hero-title">
          <Container className="gx-wrap gx-hero-grid relative grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-center gap-16 max-[1100px]:gap-8 max-[900px]:grid-cols-1 max-[900px]:gap-16 max-[600px]:gap-12">
            <div>
              <p className="gx-eyebrow">{m.landing_hero_eyebrow()}</p>
              <h1 id="hero-title">{m.landing_hero_title()}</h1>
              <p className="gx-lead">{m.landing_hero_lead()}</p>
              <div className="gx-actions mt-8 flex flex-wrap items-center gap-3">
                <Action href="#download" primary large>
                  {m.landing_hero_cta()}
                </Action>
                <Action href="/en/docs/guide" large hrefLang="en">
                  {m.landing_hero_docs()}
                </Action>
              </div>
              {lang === 'es' && <p className="gx-small gx-docs-note">{m.landing_learn_docs_note()}</p>}
              <div className="gx-hero-terminal mt-8 mb-3 max-w-90">
                <CodeBlock code={'> new my-game\n> run'} label="new my-game / run" terminal />
              </div>
              <p className="gx-small">{m.landing_hero_note()}</p>
            </div>
            <figure className="gx-hero-shot relative min-w-0">
              <div className="gx-frame">
                <PixelImage
                  file="signal-lost-gameplay.png"
                  alt={m.landing_alt_gameplay()}
                  width={320}
                  height={240}
                  pending={m.landing_missing()}
                  priority
                />
              </div>
              <div className="gx-hero-shell">
                <PixelImage
                  file="glaux-shell.png"
                  alt={m.landing_alt_shell()}
                  width={320}
                  height={240}
                  pending={m.landing_missing()}
                  priority
                />
              </div>
              <figcaption>{m.landing_hero_caption()}</figcaption>
            </figure>
          </Container>
        </section>
        <MachineFacts />
        <ConsoleOverview />
        <WorkspacePreview />
        <CartridgeGallery />
        <LearningResources />
        <section className="gx-section" id="news">
          <Container className="gx-wrap">
            <SectionHeading eyebrow={m.landing_news_eyebrow()} title={m.landing_news_title()} />
            {latestNews.length ? (
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {latestNews.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <div className="gx-news-empty mt-8 rounded-lg border border-dashed border-gx-border-strong bg-gx-surface p-10 max-[600px]:p-6">
                <h3>{m.landing_news_empty()}</h3>
                <p>{m.landing_news_text()}</p>
                <div className="mt-6">
                  <Action href={repositoryUrl}>{m.landing_news_link()}</Action>
                </div>
              </div>
            )}
            <div className="mt-6">
              <Action href={`/${lang}/news`}>
                {m.landing_news_browse()}
              </Action>
            </div>
          </Container>
        </section>
        <DownloadOptions />
      </main>
      <SiteFooter lang={lang} />
    </div>
  );
}
