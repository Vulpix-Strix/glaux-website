import { Container } from '@/components/site/primitives';
import type { LandingCopy } from '@/lib/landing/copy';
import { cartridgeFiles } from '@/lib/landing/console';
import { drawCode, soundCode } from '@/lib/landing/examples';
import { CodeBlock, Icon, Panel, PixelImage, SectionHeading } from './primitives';

// apps/glaux/src/system/workspace/render.rs renders placeholders for Map/SFX/Music.
const workspaceTools = [
  { id: 'code', available: true },
  { id: 'sprites', available: true },
  { id: 'map', available: false },
  { id: 'sfx', available: false },
  { id: 'music', available: false },
] as const;

// Static diagrams of the four waveforms supported by Glaux's audio API.
const waveforms = [
  { name: 'square', path: 'M2 22V6H18V22H34V6H50V22H62' },
  { name: 'triangle', path: 'M2 22L18 6L34 22L50 6L62 20' },
  { name: 'saw', path: 'M2 22L26 6V22L50 6V22L62 14' },
  {
    name: 'noise',
    path: 'M2 14L6 6L10 20L14 10L18 24L22 8L26 18L30 6L34 22L38 12L42 20L46 8L50 24L54 10L58 18L62 12',
  },
];

export function WorkspacePreview({
  copy,
  alt,
  pending,
}: {
  copy: LandingCopy['create'];
  alt: LandingCopy['alt'];
  pending: string;
}) {
  return (
    <section className="gx-section gx-surface gx-dither" id="create">
      <Container className="gx-wrap">
        <SectionHeading eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />
        <div className="gx-workspace-labels" aria-label={copy.hint}>
          {workspaceTools.map(({ id, available }) => (
            <span
              className={`gx-workspace-label${available ? '' : ' gx-workspace-unavailable'}`}
              key={id}
            >
              <Icon name={id} />
              {copy.tabs[id]}
              {!available && <small>{copy.unavailable}</small>}
            </span>
          ))}
          <span className="gx-small">{copy.hint}</span>
        </div>
        <div className="gx-bento">
          <div className="gx-stack">
            <Panel icon="code" title={copy.tabs.code} detail="code/main.luau">
              <CodeBlock code={drawCode} label={copy.tabs.code} />
            </Panel>
            <Panel icon="sfx" title={copy.sound} detail={copy.channels}>
              <CodeBlock code={soundCode} label={copy.sound} />
              <div className="gx-waves" aria-hidden="true">
                {waveforms.map(({ name, path }) => (
                  <div key={name}>
                    <svg viewBox="0 0 64 28" preserveAspectRatio="none">
                      <path d={path} />
                    </svg>
                    <small>{name}</small>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel icon="code" title={copy.folder} detail="my-game/">
              <ul className="gx-files">
                {cartridgeFiles.map(({ id, name }) => (
                  <li key={id}>
                    <b>{name}</b>
                    <span>{copy.files[id]}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
          <div className="gx-stack">
            <Panel icon="sprites" title={copy.tabs.sprites} detail="128×136">
              <div className="gx-sheet">
                <PixelImage
                  file="signal-lost-sprites.png"
                  alt={alt.sprites}
                  width={128}
                  height={136}
                  pending={pending}
                  className="gx-spritesheet"
                />
                <div>
                  <PixelImage
                    file="master-palette.png"
                    alt={alt.palette}
                    width={16}
                    height={16}
                    pending={pending}
                    className="gx-palette"
                  />
                  <p className="gx-small">{copy.palette}</p>
                </div>
              </div>
            </Panel>
            <Panel icon="code" title={copy.run} detail="F5">
              <div className="gx-result">
                <div className="gx-frame">
                  <PixelImage
                    file="signal-lost-title.png"
                    alt={alt.title}
                    width={320}
                    height={240}
                    pending={pending}
                  />
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </Container>
    </section>
  );
}
