import { Container } from '@/components/site/primitives';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { m } from '@/paraglide/messages';
import { firstGame } from '@/lib/landing/examples';
import { apiLinks, documentationLinks } from '@/lib/landing/navigation';
import { track } from '@/lib/posthog';
import { CodeBlock, SectionHeading } from './primitives';

const gettingStartedSteps = ['create', 'run', 'edit', 'play'] as const;

export function LearningResources() {
  return (
    <section className="gx-section gx-paper gx-dither" id="learn">
      <Container className="gx-wrap gx-learn">
        <div>
          <SectionHeading eyebrow={m.landing_learn_eyebrow()} title={m.landing_learn_title()} lead={m.landing_learn_lead()} />
          <p className="gx-small gx-docs-note">{m.landing_learn_docs_note()}</p>
          <ul className="gx-guide-links">
            {documentationLinks.map(({ id, slug }) => (
              <li key={id}>
                <Link
                  to="/$lang/docs/$"
                  params={{ lang: 'en', _splat: slug }}
                  hrefLang="en"
                  onClick={() => track('docs_opened', { source: 'learn_guides' })}
                >
                  <span>
                    <b>{m[`landing_learn_links_${id}_title`]()}</b>
                    <span>{m[`landing_learn_links_${id}_text`]()}</span>
                  </span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="gx-tags flex flex-wrap items-center gap-2 gx-categories">
            {apiLinks.map(({ id, slug, tone }) => (
              <Link
                to="/$lang/docs/$"
                params={{ lang: 'en', _splat: slug }}
                hrefLang="en"
                onClick={() => track('docs_opened', { source: 'learn_api' })}
                className={`gx-tag gx-tag-${tone}`}
                key={id}
              >
                {m[`landing_learn_categories_${id}`]()}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3>{m.landing_learn_steps_title()}</h3>
          <ol className="gx-steps">
            {gettingStartedSteps.map((id) => (
              <li key={id}>{m[`landing_learn_steps_${id}`]()}</li>
            ))}
          </ol>
          <CodeBlock code={firstGame} label={m.landing_learn_steps_title()} numbered />
        </div>
      </Container>
    </section>
  );
}
