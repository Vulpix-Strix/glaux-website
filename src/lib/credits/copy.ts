import en from './locales/en.json' with { type: 'json' };
import es from './locales/es.json' with { type: 'json' };
import type { LandingLanguage } from '../i18n.ts';

export type CreditsCopy = typeof en;
export const creditsCopy = { en, es } satisfies Record<LandingLanguage, CreditsCopy>;

/** Fills `{name}` placeholders of a translated string. */
export const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)}/g, (_, key: string) => String(values[key]));
