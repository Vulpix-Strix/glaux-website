import { Container } from '@/components/site/primitives';
import type { LandingCopy } from '@/lib/landing/copy';
import { consoleFacts } from '@/lib/landing/console';
import { editorCode, languageExamples } from '@/lib/landing/examples';
import { CodeBlock, Icon, SectionHeading } from './primitives';

export function MachineFacts({
  descriptions,
  label,
}: {
  descriptions: LandingCopy['facts'];
  label: string;
}) {
  return (
    <section className="gx-facts-band" aria-label={label}>
      <Container className="gx-wrap">
        <dl className="gx-facts">
          {consoleFacts.map(({ id, value }) => (
            <div key={id}>
              <dt>{value}</dt>
              <dd>{descriptions[id]}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

const capabilities = [
  { id: 'sprites', icon: 'sprites' },
  { id: 'sound', icon: 'sfx' },
  { id: 'projects', icon: 'code' },
] as const;

export function ConsoleOverview({ copy }: { copy: LandingCopy['features'] }) {
  return (
    <section className="gx-section" id="features">
      <Container className="gx-wrap">
        <SectionHeading eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />
        <div className="gx-split gx-feature">
          <div>
            <p className="gx-eyebrow">{copy.editor}</p>
            <h3 className="gx-feature-title">{copy.editorTitle}</h3>
            <p>{copy.editorLead}</p>
            <ul className="gx-feature-list">
              {copy.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <CodeBlock code={editorCode} label={copy.editorTitle} numbered />
            <aside className="gx-signature">
              <code>spr(tile, x, y, [w], [h], [flip_x], [flip_y], [palette])</code>
              <p>{copy.signature}</p>
              <small>
                <a className="gx-text-link" href="/en/docs/api/graphics/spr" hrefLang="en">
                  {copy.signatureDocs}
                </a>
              </small>
            </aside>
          </div>
        </div>
        <div className="gx-split gx-feature gx-split-reverse">
          <div className="gx-language-examples">
            <div>
              <p>
                <span className="gx-tag">Luau</span> {copy.default}
              </p>
              <CodeBlock code={languageExamples.luau} label="Luau" />
            </div>
            <div>
              <p>
                <span className="gx-tag gx-tag-gold">Rhai</span> {copy.experimentalLabel}
              </p>
              <CodeBlock code={languageExamples.rhai} label="Rhai" />
            </div>
          </div>
          <div>
            <p className="gx-eyebrow">{copy.languages}</p>
            <h3 className="gx-feature-title">{copy.languagesTitle}</h3>
            <p>{copy.languagesLead}</p>
            <p>{copy.experimental}</p>
          </div>
        </div>
        <div className="gx-makes">
          {capabilities.map(({ id, icon }) => (
            <article key={id}>
              <header>
                <Icon name={icon} />
                <h3>{copy.cards[id].title}</h3>
              </header>
              <p>{copy.cards[id].text}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
