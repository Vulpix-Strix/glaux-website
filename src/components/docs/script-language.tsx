import { useSyncExternalStore, type ComponentProps, type ReactNode } from 'react';
import { track } from '@/lib/posthog';

export type ScriptLanguage = 'luau' | 'rhai';

const storageKey = 'glaux-docs:script-language';
const listeners = new Set<() => void>();

function read(): ScriptLanguage {
  try {
    return localStorage.getItem(storageKey) === 'rhai' ? 'rhai' : 'luau';
  } catch {
    return 'luau';
  }
}

function write(language: ScriptLanguage) {
  try {
    localStorage.setItem(storageKey, language);
  } catch {
    // Private mode or blocked storage: the choice only lasts until reload.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  window.addEventListener('storage', notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener('storage', notify);
  };
}

/** The reader's preferred script language. Luau on the server and until the choice is stored. */
export function useScriptLanguage() {
  return [useSyncExternalStore(subscribe, read, () => 'luau'), write] as const;
}

const options: { id: ScriptLanguage; label: string }[] = [
  { id: 'luau', label: 'Luau' },
  { id: 'rhai', label: 'Rhai' },
];

/** Segmented control for the sidebar. Code samples in the other language fold away. */
export function ScriptLanguageToggle() {
  const [language, setLanguage] = useScriptLanguage();
  function selectLanguage(nextLanguage: ScriptLanguage) {
    if (nextLanguage === language) return;
    setLanguage(nextLanguage);
    track('feature_interacted', { feature: 'script_language', action: `select_${nextLanguage}` });
  }
  return (
    <div className="gx-docs-script">
      <p className="gx-docs-label" id="gx-script-label">Script language</p>
      <div className="gx-docs-seg" role="group" aria-labelledby="gx-script-label">
        {options.map(({ id, label }) => (
          <button type="button" key={id} aria-pressed={language === id} onClick={() => selectLanguage(id)}>
            {label}
          </button>
        ))}
      </div>
      <p className="gx-docs-hint">Code samples follow your choice.</p>
    </div>
  );
}

/**
 * Wraps a code block. A Luau or Rhai sample that is not the reader's language is
 * folded into a closed <details>, so it stays reachable and searchable.
 */
export function ScriptLanguageFold({ language, children }: { language: ScriptLanguage; children: ReactNode }) {
  const [preferred] = useScriptLanguage();
  if (preferred === language) return <>{children}</>;
  const name = language === 'rhai' ? 'Rhai · experimental' : 'Luau';
  return (
    <details className="gx-docs-fold">
      <summary>Show {name} sample</summary>
      {children}
    </details>
  );
}

export type PreProps = ComponentProps<'pre'> & { 'data-language'?: string };
