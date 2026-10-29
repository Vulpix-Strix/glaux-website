import { Container } from '@/components/site/primitives';
import { ArrowRight } from 'lucide-react';
import type { LandingCopy } from '@/lib/landing/copy';
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

export function CartridgeGallery({
  copy,
  alt,
  pending,
}: {
  copy: LandingCopy['games'];
  alt: LandingCopy['alt'];
  pending: string;
}) {
  return (
    <section className="gx-section" id="games">
      <Container className="gx-wrap">
        <SectionHeading eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />
        <div className="gx-games">
          <article className="gx-game-feature">
            <div className="gx-stage">
              <PixelImage
                file="signal-lost-title.png"
                alt={alt.title}
                width={320}
                height={240}
                pending={pending}
              />
            </div>
            <div className="gx-game-body">
              <div className="gx-tags flex flex-wrap items-center gap-2">
                <span className="gx-tag gx-tag-gold">{copy.featured}</span>
                <span className="gx-tag">Luau</span>
                <span className="gx-tag gx-tag-pink">{copy.genre}</span>
              </div>
              <h3>Signal Lost</h3>
              <p>{copy.description}</p>
              <p className="gx-small">{copy.controls}</p>
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
                    alt={alt[example.alt]}
                    width={example.width}
                    height={example.height}
                    pending={pending}
                  />
                </div>
                <div>
                  <h3>
                    <a href={`${repositoryUrl}/tree/main/examples/${example.directory}`}>
                      {example.name}
                    </a>
                    {example.experimental && (
                      <span className="gx-tag gx-tag-gold">{copy.experimental}</span>
                    )}
                  </h3>
                  <p>{copy.rows[example.id]}</p>
                </div>
              </article>
            ))}
            <p className="gx-small">{copy.note}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
