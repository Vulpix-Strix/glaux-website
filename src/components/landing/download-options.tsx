import { ArrowRight } from 'lucide-react';
import type { LandingCopy } from '@/lib/landing/copy';
import { buildCommands } from '@/lib/landing/examples';
import { repositoryUrl } from '@/lib/landing/navigation';
import { CodeBlock, SectionHeading } from './primitives';

export function DownloadOptions({ copy }: { copy: LandingCopy['get'] }) {
  return (
    <section className="gx-section gx-sunken gx-dither" id="download">
      <div className="gx-wrap">
        <SectionHeading eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />
        <div className="gx-downloads">
          {['Linux', 'macOS', 'Windows'].map((os) => (
            <article key={os}>
              <h3>{os}</h3>
              <p className="gx-small">{copy.binary}</p>
              <button className="gx-button gx-button-large" disabled>
                {copy.unavailable}<span className="gx-sr">: {os}</span>
              </button>
            </article>
          ))}
        </div>
        <div className="gx-download-details">
          <div>
            <h3>{copy.source}</h3>
            <p>{copy.sourceText}</p>
            <CodeBlock code={buildCommands} label={copy.source} terminal />
            <a className="gx-text-link" href={repositoryUrl}>
              {copy.prerequisites} <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
          <div>
            <h3>{copy.browser}</h3>
            <p>{copy.browserText}</p>
            <div className="gx-browser-unavailable">
              <button className="gx-button gx-button-large" disabled>{copy.browserButton}</button>
              <span className="gx-small">{copy.unavailable}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
