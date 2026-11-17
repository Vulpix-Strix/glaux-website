import { useNavigate } from '@tanstack/react-router';
import type { ChangeEvent } from 'react';
import type { VersionKind } from '@/lib/glaux/catalog';
import type { VersionOption } from '@/lib/docs/versions';
import { track } from '@/lib/posthog';
import { m } from '@/paraglide/messages';

function optionLabel({ id, kind, recommended }: VersionOption) {
  const name = kind === 'development' ? m.docs_version_development() : id;
  const notes = [kind === 'prerelease' && m.docs_version_prerelease(), recommended && m.docs_version_recommended()].filter(Boolean);
  return notes.length > 0 ? `${name} · ${notes.join(', ')}` : name;
}

const hints: Record<VersionKind, () => string> = {
  release: m.docs_version_hint_release,
  prerelease: m.docs_version_hint_prerelease,
  development: m.docs_version_hint_development,
};

/** Picks the documentation version. The page and language are kept when the version has the page. */
export function VersionSelect({ version, versions, pageTitle }: { version: string; versions: VersionOption[]; pageTitle: string }) {
  const navigate = useNavigate();
  const current = versions.find((v) => v.id === version);

  function select(event: ChangeEvent<HTMLSelectElement>) {
    const next = versions.find((v) => v.id === event.target.value);
    if (!next || next.id === version) return;
    track('feature_interacted', { feature: 'docs_version', action: `select_${next.kind}` });
    void navigate({ href: next.href, state: next.hasPage ? {} : { missingPage: pageTitle } });
  }

  return (
    <div className="gx-docs-version">
      <label className="gx-docs-label" htmlFor="gx-version-select">{m.docs_version_label()}</label>
      <select id="gx-version-select" value={version} onChange={select}>
        {versions.map((v) => (
          <option key={v.id} value={v.id}>{optionLabel(v)}</option>
        ))}
      </select>
      {current && <p className="gx-docs-hint" data-kind={current.kind}>{hints[current.kind]()}</p>}
    </div>
  );
}
