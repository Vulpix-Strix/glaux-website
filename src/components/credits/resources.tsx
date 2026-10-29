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

export function Resources({ art, copy, libraries }: { art: ArtEntry[]; copy: CreditsCopy['resources']; libraries: CreditsCopy['libraries'] }) {
  return (
    <section className="gx-section gx-credits-resources" id="resources" aria-labelledby="resources-title">
      <div className="gx-wrap">
        <p className="gx-eyebrow">{copy.eyebrow}</p>
        <h2 id="resources-title">{copy.title}</h2>
        <p className="gx-lead">{copy.lead}</p>
        <ul className="gx-credits-art">
          {art.map((entry) => <ArtCard key={entry.name} entry={entry} copy={copy} libraries={libraries} />)}
        </ul>
      </div>
    </section>
  );
}

function ArtCard({ entry, copy, libraries }: { entry: ArtEntry; copy: CreditsCopy['resources']; libraries: CreditsCopy['libraries'] }) {
  const [opened, setOpened] = useState(false);
  const look = artLooks[entry.name];
  return (
    <li className="gx-credits-card gx-credits-art-card">
      <div className="gx-credits-preview" aria-hidden="true">{look?.kind === 'font' ? 'Aa' : [...entry.name][0]}</div>
      <div className="gx-credits-art-body">
        {look && <span className={`gx-tag ${look.tag}`}>{copy.kinds[look.kind]}</span>}
        <h3>
          {entry.repository ? <a href={entry.repository}>{entry.name}<ExternalLink size={16} /></a> : entry.name}
        </h3>
        {entry.author && <p>{fill(copy.by, { author: entry.author })}</p>}
        {entry.license ? (
          <span className="gx-credits-badge">{entry.license}</span>
        ) : (
          <span className="gx-credits-badge gx-credits-badge-warning"><TriangleAlert size={16} />{copy.notStated}</span>
        )}
        <details onToggle={(event) => event.currentTarget.open && setOpened(true)}>
          <summary>{libraries.texts}</summary>
          {opened && <LicenseTexts source="glaux" ids={entry.text_ids} copy={libraries} />}
        </details>
      </div>
    </li>
  );
}
