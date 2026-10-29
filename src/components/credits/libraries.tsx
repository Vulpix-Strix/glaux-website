import { Container } from '@/components/site/primitives';
import { Button } from '@/components/site/primitives';
import { useEffect, useState, type KeyboardEvent } from 'react';
import {
  familyCounts,
  filterEntries,
  licenseFamilies,
  type CreditEntry,
  type FamilyFilter,
} from '@/lib/credits/browse';
import { fill, type CreditsCopy } from '@/lib/credits/copy';
import { loadCredits, type GlauxFile, type NpmFile, type TextsSource } from '@/lib/credits/data';
import { ChevronDown, ExternalLink, Search } from 'lucide-react';
import { LicenseTexts } from './license-texts';

const tabs = ['rust', 'npm', 'native'] as const;
type Tab = (typeof tabs)[number];
type Copy = CreditsCopy['libraries'];
type Files = { glaux: GlauxFile; npm: NpmFile };

const FIRST_PAGE = 12;
const NEXT_PAGE = 24;

const shortUrl = (url: string) => url.replace(/^https?:\/\//, '').replace(/\.git$/, '');

export function Libraries({ copy }: { copy: Copy }) {
  const [files, setFiles] = useState<Files | 'failed' | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<Tab>('rust');
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<FamilyFilter>('all');
  const [shown, setShown] = useState(FIRST_PAGE);

  useEffect(() => {
    let current = true;
    Promise.all([loadCredits<GlauxFile>('glaux.json'), loadCredits<NpmFile>('npm.json')]).then(
      ([glaux, npm]) => current && setFiles({ glaux, npm }),
      () => current && setFiles('failed'),
    );
    return () => {
      current = false;
    };
  }, [attempt]);

  const loaded = files && files !== 'failed' ? files : null;
  const lists: Record<Tab, CreditEntry[]> = {
    rust: loaded?.glaux.libraries ?? [],
    npm: loaded?.npm.entries ?? [],
    native: loaded?.glaux.native ?? [],
  };
  const source: TextsSource = tab === 'npm' ? 'npm' : 'glaux';
  const counts = familyCounts(lists[tab], query);
  const rows = filterEntries(lists[tab], query, family);
  const visible = rows.slice(0, shown);

  const choose = (next: Tab) => {
    setTab(next);
    setFamily('all');
    setShown(FIRST_PAGE);
  };
  const onTabKey = (event: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : step
            ? (tabs.indexOf(tab) + step + tabs.length) % tabs.length
            : undefined;
    if (next === undefined) return;
    event.preventDefault();
    choose(tabs[next]);
    document.getElementById(`credits-tab-${tabs[next]}`)?.focus();
  };

  return (
    <section
      className="gx-section gx-credits-libraries border-t border-gx-border bg-gx-sunken"
      id="libraries"
      aria-labelledby="libraries-title"
    >
      <Container className="gx-wrap">
        <p className="gx-eyebrow">{copy.eyebrow}</p>
        <h2 id="libraries-title">{copy.title}</h2>
        <p className="gx-lead">{copy.lead}</p>

        <div
          className="gx-credits-tabs"
          role="tablist"
          aria-label={copy.sourceLabel}
          onKeyDown={onTabKey}
        >
          {tabs.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`credits-tab-${id}`}
              aria-selected={tab === id}
              aria-controls="credits-panel"
              tabIndex={tab === id ? 0 : -1}
              onClick={() => choose(id)}
            >
              {copy.tabs[id]}
              {loaded && <span>{lists[id].length}</span>}
            </button>
          ))}
        </div>

        <div className="gx-credits-toolbar my-6 flex flex-wrap items-center gap-4">
          <div className="gx-credits-search">
            <label className="gx-sr" htmlFor="credits-search">
              {copy.searchLabel}
            </label>
            <Search size={16} />
            <input
              id="credits-search"
              type="search"
              value={query}
              placeholder={copy.searchPlaceholder}
              onChange={(event) => {
                setQuery(event.target.value);
                setShown(FIRST_PAGE);
              }}
            />
          </div>
          <div
            className="gx-credits-chips flex flex-wrap gap-2"
            role="group"
            aria-label={copy.filterLabel}
          >
            {(['all', ...licenseFamilies] as const)
              .filter((id) => id === 'all' || counts[id] > 0 || id === family)
              .map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={family === id}
                  onClick={() => {
                    setFamily(id);
                    setShown(FIRST_PAGE);
                  }}
                >
                  {copy.families[id]}
                  <small>
                    {id === 'all' ? filterEntries(lists[tab], query, 'all').length : counts[id]}
                  </small>
                </button>
              ))}
          </div>
        </div>

        <div role="tabpanel" id="credits-panel" aria-labelledby={`credits-tab-${tab}`}>
          <p className="gx-credits-summary" aria-live="polite">
            {loaded && fill(copy.summary, { shown: visible.length, total: rows.length })}
          </p>
          {!files && (
            <p className="gx-credits-status px-4 py-8 text-center" role="status">
              {copy.loading}
            </p>
          )}
          {files === 'failed' && (
            <p className="gx-credits-status px-4 py-8 text-center" role="alert">
              {copy.failed}{' '}
              <button
                type="button"
                className="gx-credits-link"
                onClick={() => {
                  setFiles(null);
                  setAttempt(attempt + 1);
                }}
              >
                {copy.retry}
              </button>
            </p>
          )}
          {loaded && rows.length === 0 && (
            <div className="gx-news-empty mt-8 rounded-lg border border-dashed border-gx-border-strong bg-gx-surface p-10 max-[600px]:p-6">
              <h3>{copy.emptyTitle}</h3>
              <p>{copy.emptyText}</p>
            </div>
          )}
          {visible.length > 0 && (
            <ul className="gx-credits-list m-0 list-none overflow-hidden rounded-lg border border-gx-border bg-gx-surface p-0">
              {visible.map((entry) => (
                <Row
                  key={`${tab}:${entry.name}@${entry.version}`}
                  entry={entry}
                  source={source}
                  copy={copy}
                />
              ))}
            </ul>
          )}
          {rows.length > visible.length && (
            <div className="gx-credits-more flex justify-center pt-4">
              <Button onClick={() => setShown(shown + NEXT_PAGE)}>
                {fill(copy.more, { count: Math.min(NEXT_PAGE, rows.length - visible.length) })}
              </Button>
            </div>
          )}
          {loaded && tab === 'npm' && (
            <p className="gx-small">
              {fill(copy.npmNote, {
                platform: loaded.npm.platform,
                omitted: loaded.npm.omitted.join(', '),
              })}
            </p>
          )}
          {loaded && tab !== 'npm' && loaded.glaux.source.commit && (
            <p className="gx-small">
              {fill(copy.glauxNote, { commit: loaded.glaux.source.commit.slice(0, 7) })}{' '}
              <a
                href={`${loaded.glaux.source.repository.replace(/\.git$/, '')}/commit/${loaded.glaux.source.commit}`}
              >
                {shortUrl(loaded.glaux.source.repository)}
              </a>
            </p>
          )}
        </div>
      </Container>
    </section>
  );
}

function Row({ entry, source, copy }: { entry: CreditEntry; source: TextsSource; copy: Copy }) {
  const [opened, setOpened] = useState(false);
  const npm = 'scope' in entry ? entry : undefined;
  const sub = npm ? npm.author : entry.repository && shortUrl(entry.repository);
  const details = copy.details;
  return (
    <li>
      <details onToggle={(event) => event.currentTarget.open && setOpened(true)}>
        <summary className="gx-credits-row">
          <span className="gx-credits-id flex min-w-0 flex-col">
            <span className="gx-credits-name">{entry.name}</span>
            {sub && <span className="gx-credits-sub">{sub}</span>}
          </span>
          <span className="gx-credits-version">{entry.version && `v${entry.version}`}</span>
          <span className="gx-credits-badge">{entry.license}</span>
          <ChevronDown size={16} />
        </summary>
        <div className="gx-credits-detail">
          <dl>
            <dt>{details.license}</dt>
            <dd>
              <code>{entry.license}</code>
            </dd>
            {npm?.author && (
              <>
                <dt>{details.author}</dt>
                <dd>{npm.author}</dd>
              </>
            )}
            {npm && (
              <>
                <dt>{details.scope}</dt>
                <dd>{details[npm.scope]}</dd>
              </>
            )}
            {npm && (
              <>
                <dt>{details.direct}</dt>
                <dd>{npm.direct ? details.yes : details.no}</dd>
              </>
            )}
            {npm?.binaries && (
              <>
                <dt>{details.binaries}</dt>
                <dd>{npm.binaries.join(', ')}</dd>
              </>
            )}
            {entry.repository && (
              <>
                <dt>{details.repository}</dt>
                <dd>
                  <a href={entry.repository}>
                    {shortUrl(entry.repository)}
                    <ExternalLink size={16} />
                  </a>
                </dd>
              </>
            )}
          </dl>
          {entry.license.includes(' OR ') && <p className="gx-small">{copy.dual}</p>}
          {opened && <LicenseTexts source={source} ids={entry.text_ids} copy={copy} />}
        </div>
      </details>
    </li>
  );
}
