import { Container } from '@/components/site/primitives';
import { m } from '@/paraglide/messages';
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

export function WorkspacePreview() {
  return (
    <section className="gx-section gx-surface gx-dither" id="create">
      <Container className="gx-wrap">
        <SectionHeading eyebrow={m.landing_create_eyebrow()} title={m.landing_create_title()} lead={m.landing_create_lead()} />
        <div className="gx-workspace-labels" aria-label={m.landing_create_hint()}>
          {workspaceTools.map(({ id, available }) => (
            <span
              className={`gx-workspace-label${available ? '' : ' gx-workspace-unavailable'}`}
              key={id}
            >
              <Icon name={id} />
              {m[`landing_create_tabs_${id}`]()}
              {!available && <small>{m.landing_create_unavailable()}</small>}
            </span>
          ))}
          <span className="gx-small">{m.landing_create_hint()}</span>
        </div>
        <div className="gx-bento">
          <div className="gx-stack">
            <Panel icon="code" title={m.landing_create_tabs_code()} detail="code/main.luau">
              <CodeBlock code={drawCode} label={m.landing_create_tabs_code()} />
            </Panel>
            <Panel icon="sfx" title={m.landing_create_sound()} detail={m.landing_create_channels()}>
              <CodeBlock code={soundCode} label={m.landing_create_sound()} />
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
            <Panel icon="code" title={m.landing_create_folder()} detail="my-game/">
              <ul className="gx-files">
                {cartridgeFiles.map(({ id, name }) => (
                  <li key={id}>
                    <b>{name}</b>
                    <span>{m[`landing_create_files_${id}`]()}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
          <div className="gx-stack">
            <Panel icon="sprites" title={m.landing_create_tabs_sprites()} detail="128×136">
              <div className="gx-sheet">
                <PixelImage
                  file="signal-lost-sprites.png"
                  alt={m.landing_alt_sprites()}
                  width={128}
                  height={136}
                  pending={m.landing_missing()}
                  className="gx-spritesheet"
                />
                <div>
                  <PixelImage
                    file="master-palette.png"
                    alt={m.landing_alt_palette()}
                    width={16}
                    height={16}
                    pending={m.landing_missing()}
                    className="gx-palette"
                  />
                  <p className="gx-small">{m.landing_create_palette()}</p>
                </div>
              </div>
            </Panel>
            <Panel icon="code" title={m.landing_create_run()} detail="F5">
              <div className="gx-result">
                <div className="gx-frame">
                  <PixelImage
                    file="signal-lost-title.png"
                    alt={m.landing_alt_title()}
                    width={320}
                    height={240}
                    pending={m.landing_missing()}
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
