import { Container } from '@/components/site/primitives';
import { ArrowRight } from 'lucide-react';
import { m } from '@/paraglide/messages';
import { repositoryUrl } from '@/lib/landing/navigation';
import { PixelImage, SectionHeading } from './primitives';

// Existing cartridges in Glaux's examples/ directory, with their original assets.
const examples = [
  {
    id: 'rhai',
    name: 'Signal Lost (Rhai)',
    directory: 'signal-lost-rhai',
    image: 'signal-lost-gameplay.png',
    alt: 'gameplay',
    width: 320,
    height: 240,
    experimental: true,
  },
  {
    id: 'sprites',
    name: 'Sprites',
    directory: 'sprites',
    image: 'micro-asset-pack.png',
    alt: 'micro',
    width: 64,
    height: 64,
    experimental: false,
  },
  {
    id: 'palettes',
    name: 'Palettes',
    directory: 'palettes',
    image: 'palettes-sprites.png',
    alt: 'palettes',
    width: 48,
    height: 16,
    experimental: false,
  },
] as const;

export function CartridgeGallery() {
  return (
    <section className="gx-section" id="games">
      <Container className="gx-wrap">
        <SectionHeading eyebrow={m.landing_games_eyebrow()} title={m.landing_games_title()} lead={m.landing_games_lead()} />
        <div className="gx-games">
          <article className="gx-game-feature">
            <div className="gx-stage">
              <PixelImage
                file="signal-lost-title.png"
                alt={m.landing_alt_title()}
                width={320}
                height={240}
                pending={m.landing_missing()}
              />
            </div>
            <div className="gx-game-body">
              <div className="gx-tags flex flex-wrap items-center gap-2">
                <span className="gx-tag gx-tag-gold">{m.landing_games_featured()}</span>
                <span className="gx-tag">Luau</span>
                <span className="gx-tag gx-tag-pink">{m.landing_games_genre()}</span>
              </div>
              <h3>Signal Lost</h3>
              <p>{m.landing_games_description()}</p>
              <p className="gx-small">{m.landing_games_controls()}</p>
              <a className="gx-text-link" href={`${repositoryUrl}/tree/main/examples/signal-lost`}>
                Signal Lost <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
          </article>
          <div className="gx-stack">
            {examples.map((example) => (
              <article className="gx-game-row" key={example.id}>
                <div className="gx-stage">
                  <PixelImage
                    file={example.image}
                    alt={m[`landing_alt_${example.alt}`]()}
                    width={example.width}
                    height={example.height}
                    pending={m.landing_missing()}
                  />
                </div>
                <div>
                  <h3>
                    <a href={`${repositoryUrl}/tree/main/examples/${example.directory}`}>
                      {example.name}
                    </a>
                    {example.experimental && (
                      <span className="gx-tag gx-tag-gold">{m.landing_games_experimental()}</span>
                    )}
                  </h3>
                  <p>{m[`landing_games_rows_${example.id}`]()}</p>
                </div>
              </article>
            ))}
            <p className="gx-small">{m.landing_games_note()}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
