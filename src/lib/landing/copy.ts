import en from './locales/en.json' with { type: 'json' };
import es from './locales/es.json' with { type: 'json' };
import type { LandingLanguage } from '../i18n.ts';

export type LandingCopy = typeof en;
export const landingCopy = { en, es } satisfies Record<LandingLanguage, LandingCopy>;
