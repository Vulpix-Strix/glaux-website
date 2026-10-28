import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type { LandingCopy } from '@/lib/landing/copy';
import { firstGame } from '@/lib/landing/examples';
import { apiLinks, documentationLinks } from '@/lib/landing/navigation';
import { CodeBlock, SectionHeading } from './primitives';

const gettingStartedSteps = ['create', 'run', 'edit', 'play'] as const;

export function LearningResources({ copy }: { copy: LandingCopy['learn'] }) {
  return (
    <section className="gx-section gx-paper gx-dither" id="learn">
      <div className="gx-wrap gx-learn">
        <div>
          <SectionHeading eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />
          <p className="gx-small gx-docs-note">{copy.docsNote}</p>
          <ul className="gx-guide-links">
            {documentationLinks.map(({ id, slug }) => (
              <li key={id}>
                <Link to="/$lang/docs/$" params={{ lang: 'en', _splat: slug }} hrefLang="en">
                  <span><b>{copy.links[id].title}</b><span>{copy.links[id].text}</span></span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="gx-tags gx-categories">
            {apiLinks.map(({ id, slug, tone }) => (
              <Link to="/$lang/docs/$" params={{ lang: 'en', _splat: slug }} hrefLang="en" className={`gx-tag gx-tag-${tone}`} key={id}>
                {copy.categories[id]}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3>{copy.stepsTitle}</h3>
          <ol className="gx-steps">
            {gettingStartedSteps.map((id) => <li key={id}>{copy.steps[id]}</li>)}
          </ol>
          <CodeBlock code={firstGame} label={copy.stepsTitle} numbered />
        </div>
      </div>
    </section>
  );
}
