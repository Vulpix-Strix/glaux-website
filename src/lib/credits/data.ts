import type { Editorial } from './ron.ts';
import type { LicenseEntry, LicenseText } from './glaux.ts';
import type { NpmEntry } from './npm.ts';

/** The shapes of `public/credits/*.json`, which `pnpm credits:sync` writes. */
export interface ArtEntry extends LicenseEntry {
  author?: string;
}
export interface EditorialFile {
  sections: Editorial['sections'];
  art: ArtEntry[];
}
export interface GlauxFile {
  source: { repository: string; commit?: string };
  libraries: LicenseEntry[];
  native: LicenseEntry[];
}
export interface NpmFile {
  platform: string;
  entries: NpmEntry[];
  omitted: string[];
}

/** Which texts file an entry's `text_ids` index into. */
export type TextsSource = 'glaux' | 'npm';

const requests = new Map<string, Promise<unknown>>();

/** Fetches a generated file once. A failed request is forgotten, so asking again retries. */
export function loadCredits<T>(file: string): Promise<T> {
  let request = requests.get(file);
  if (!request) {
    request = fetch(`/credits/${file}`).then((response) => {
      if (!response.ok) throw new Error(`${file}: ${response.status}`);
      return response.json();
    });
    request.catch(() => requests.delete(file));
    requests.set(file, request);
  }
  return request as Promise<T>;
}

/** The license texts, fetched only when a page shows one. */
export const loadTexts = (source: TextsSource) => loadCredits<{ texts: LicenseText[] }>(`${source}-texts.json`).then((file) => file.texts);
