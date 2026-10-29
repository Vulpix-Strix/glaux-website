import { Container } from '@/components/site/primitives';
import { m } from '@/paraglide/messages';
import { consoleFacts } from '@/lib/landing/console';
import { editorCode, languageExamples } from '@/lib/landing/examples';
import { track } from '@/lib/posthog';
import { CodeBlock, Icon, SectionHeading } from './primitives';

export function MachineFacts() {
  return (
    <section className="gx-facts-band" aria-label={m.landing_facts_label()}>
      <Container className="gx-wrap">
        <dl className="gx-facts">
          {consoleFacts.map(({ id, value }) => (
            <div key={id}>
              <dt>{value}</dt>
              <dd>{m[`landing_facts_${id}`]()}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

const editorItems = [0, 1, 2, 3] as const;

const capabilities = [
  { id: 'sprites', icon: 'sprites' },
  { id: 'sound', icon: 'sfx' },
  { id: 'projects', icon: 'code' },
] as const;

export function ConsoleOverview() {
  return (
    <section className="gx-section" id="features">
      <Container className="gx-wrap">
        <SectionHeading eyebrow={m.landing_features_eyebrow()} title={m.landing_features_title()} lead={m.landing_features_lead()} />
        <div className="gx-split gx-feature">
          <div>
            <p className="gx-eyebrow">{m.landing_features_editor()}</p>
            <h3 className="gx-feature-title">{m.landing_features_editor_title()}</h3>
            <p>{m.landing_features_editor_lead()}</p>
            <ul className="gx-feature-list">
              {editorItems.map((item) => (
                <li key={item}>{m[`landing_features_items_${item}`]()}</li>
              ))}
            </ul>
          </div>
          <div>
            <CodeBlock code={editorCode} label={m.landing_features_editor_title()} numbered />
            <aside className="gx-signature">
              <code>spr(tile, x, y, [w], [h], [flip_x], [flip_y], [palette])</code>
              <p>{m.landing_features_signature()}</p>
              <small>
                <a
                  className="gx-text-link"
                  href="/en/docs/api/graphics/spr"
                  hrefLang="en"
                  onClick={() => track('docs_opened', { source: 'features' })}
                >
                  {m.landing_features_signature_docs()}
                </a>
              </small>
            </aside>
          </div>
        </div>
        <div className="gx-split gx-feature gx-split-reverse">
          <div className="gx-language-examples">
            <div>
              <p>
                <span className="gx-tag">Luau</span> {m.landing_features_default()}
              </p>
              <CodeBlock code={languageExamples.luau} label="Luau" />
            </div>
            <div>
              <p>
                <span className="gx-tag gx-tag-gold">Rhai</span> {m.landing_features_experimental_label()}
              </p>
              <CodeBlock code={languageExamples.rhai} label="Rhai" />
            </div>
          </div>
          <div>
            <p className="gx-eyebrow">{m.landing_features_languages()}</p>
            <h3 className="gx-feature-title">{m.landing_features_languages_title()}</h3>
            <p>{m.landing_features_languages_lead()}</p>
            <p>{m.landing_features_experimental()}</p>
          </div>
        </div>
        <div className="gx-makes">
          {capabilities.map(({ id, icon }) => (
            <article key={id}>
              <header>
                <Icon name={icon} />
                <h3>{m[`landing_features_cards_${id}_title`]()}</h3>
              </header>
              <p>{m[`landing_features_cards_${id}_text`]()}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
