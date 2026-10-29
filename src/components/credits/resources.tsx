import { Container } from '@/components/site/primitives';
import { useState } from 'react';
import type { CreditsCopy } from '@/lib/credits/copy';
import { fill } from '@/lib/credits/copy';
import type { ArtEntry } from '@/lib/credits/data';
import { ExternalLink, TriangleAlert } from 'lucide-react';
import { LicenseTexts } from './license-texts';

type ArtKind = keyof CreditsCopy['resources']['kinds'];

/**
 * Optional looks for the art in the inventory, by entry name. An entry with none (a new
 * one, say) renders from its own data alone.
 */
const artLooks: Record<string, { kind: ArtKind; tag: string }> = {
  'Pixel Code': { kind: 'font', tag: 'gx-tag-violet' },
  '1-bit Pixel Icons': { kind: 'icons', tag: 'gx-tag-lime' },
  'Simple Pixel Cursors': { kind: 'cursors', tag: 'gx-tag-gold' },
  'Zughy 32': { kind: 'palette', tag: 'gx-tag-orange' },
};

export function Resources({
  art,
  copy,
  libraries,
}: {
  art: ArtEntry[];
  copy: CreditsCopy['resources'];
  libraries: CreditsCopy['libraries'];
}) {
  return (
    <section
      className="gx-section gx-credits-resources"
      id="resources"
      aria-labelledby="resources-title"
    >
      <Container className="gx-wrap">
        <p className="gx-eyebrow">{copy.eyebrow}</p>
        <h2 id="resources-title">{copy.title}</h2>
        <p className="gx-lead">{copy.lead}</p>
        <ul className="gx-credits-art mt-10 grid list-none grid-cols-[repeat(auto-fill,minmax(min(260px,100%),1fr))] gap-4 p-0">
          {art.map((entry) => (
            <ArtCard key={entry.name} entry={entry} copy={copy} libraries={libraries} />
          ))}
        </ul>
      </Container>
    </section>
  );
}

function ArtCard({
  entry,
  copy,
  libraries,
}: {
  entry: ArtEntry;
  copy: CreditsCopy['resources'];
  libraries: CreditsCopy['libraries'];
}) {
  const [opened, setOpened] = useState(false);
  const look = artLooks[entry.name];
  return (
    <li className="gx-credits-card min-w-0 rounded-lg border border-gx-border bg-gx-surface gx-credits-art-card flex flex-col overflow-hidden">
      <div
        className="gx-credits-preview grid h-33 place-items-center border-b border-gx-border bg-[#181215] font-gx-pixel text-[54px] leading-none text-[#dff6f5]"
        aria-hidden="true"
      >
        {look?.kind === 'font' ? 'Aa' : [...entry.name][0]}
      </div>
      <div className="gx-credits-art-body grid justify-items-start gap-2 p-5">
        {look && <span className={`gx-tag ${look.tag}`}>{copy.kinds[look.kind]}</span>}
        <h3>
          {entry.repository ? (
            <a href={entry.repository}>
              {entry.name}
              <ExternalLink size={16} />
            </a>
          ) : (
            entry.name
          )}
        </h3>
        {entry.author && <p>{fill(copy.by, { author: entry.author })}</p>}
        {entry.license ? (
          <span className="gx-credits-badge">{entry.license}</span>
        ) : (
          <span className="gx-credits-badge gx-credits-badge-warning">
            <TriangleAlert size={16} />
            {copy.notStated}
          </span>
        )}
        <details onToggle={(event) => event.currentTarget.open && setOpened(true)}>
          <summary>{libraries.texts}</summary>
          {opened && <LicenseTexts source="glaux" ids={entry.text_ids} copy={libraries} />}
        </details>
      </div>
    </li>
  );
}
