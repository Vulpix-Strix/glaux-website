import { Container } from '@/components/site/primitives';
import { Button } from '@/components/site/primitives';
import { ArrowRight } from 'lucide-react';
import { m } from '@/paraglide/messages';
import { buildCommands } from '@/lib/landing/examples';
import { repositoryUrl } from '@/lib/landing/navigation';
import { CodeBlock, SectionHeading } from './primitives';
import { track } from '@/lib/posthog';

export function DownloadOptions() {
  return (
    <section className="gx-section gx-sunken gx-dither" id="download">
      <Container className="gx-wrap">
        <SectionHeading eyebrow={m.landing_get_eyebrow()} title={m.landing_get_title()} lead={m.landing_get_lead()} />
        <div className="gx-downloads">
          {['Linux', 'macOS', 'Windows'].map((os) => (
            <article key={os}>
              <h3>{os}</h3>
              <p className="gx-small">{m.landing_get_binary()}</p>
              <Button className="min-h-12! px-6! text-base!" disabled>
                {m.landing_get_unavailable()}
                <span className="gx-sr">: {os}</span>
              </Button>
            </article>
          ))}
        </div>
        <div className="gx-download-details">
          <div>
            <h3>{m.landing_get_source()}</h3>
            <p>{m.landing_get_source_text()}</p>
            <CodeBlock code={buildCommands} label={m.landing_get_source()} terminal />
            <a className="gx-text-link" href={repositoryUrl} onClick={() => track('github_clicked', { source: 'download_source' })}>
              {m.landing_get_prerequisites()} <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
          <div>
            <h3>{m.landing_get_browser()}</h3>
            <p>{m.landing_get_browser_text()}</p>
            <div className="gx-browser-unavailable">
              <Button className="min-h-12! px-6! text-base!" disabled>
                {m.landing_get_browser_button()}
              </Button>
              <span className="gx-small">{m.landing_get_unavailable()}</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
