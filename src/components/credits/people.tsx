import { Container } from '@/components/site/primitives';
import { Action } from '@/components/landing/primitives';
import { repositoryUrl } from '@/lib/landing/navigation';
import type { CreditsCopy } from '@/lib/credits/copy';
import type { EditorialFile } from '@/lib/credits/data';
import { ExternalLink } from 'lucide-react';

export function People({
  sections,
  copy,
}: {
  sections: EditorialFile['sections'];
  copy: CreditsCopy['people'];
}) {
  return (
    <section className="gx-section" id="people" aria-labelledby="people-title">
      <Container className="gx-wrap gx-credits-stack flex flex-col gap-14">
        <h2 id="people-title" className="gx-sr">
          {copy.title}
        </h2>
        {sections.map((section) => (
          <div key={section.title}>
            <p className="gx-eyebrow">
              {(copy.sections as Record<string, string>)[section.title] ?? section.title}
            </p>
            <ul className="gx-credits-people m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-4 p-0">
              {section.items.map((item) =>
                item.type === 'message' ? (
                  <li
                    className="gx-credits-card min-w-0 rounded-lg border border-gx-border bg-gx-surface gx-credits-featured"
                    key={item.text}
                  >
                    <Initial name={item.text} />
                    <div>
                      <h3>{item.text}</h3>
                      <Action href={repositoryUrl}>
                        {copy.repository}
                        <ExternalLink size={16} />
                      </Action>
                    </div>
                  </li>
                ) : (
                  <li
                    className="gx-credits-card min-w-0 rounded-lg border border-gx-border bg-gx-surface"
                    key={`${item.role}/${item.name}`}
                  >
                    <Initial name={item.name} />
                    <div>
                      <h3>{item.name}</h3>
                      <span className="gx-tag">{item.role}</span>
                    </div>
                  </li>
                ),
              )}
            </ul>
          </div>
        ))}
      </Container>
    </section>
  );
}

function Initial({ name }: { name: string }) {
  return (
    <span className="gx-credits-initial" aria-hidden="true">
      {[...name][0]}
    </span>
  );
}
