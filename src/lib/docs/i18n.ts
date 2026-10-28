import { defineI18n } from 'fumadocs-core/i18n';
import { uiTranslations } from 'fumadocs-ui/i18n';
import { defaultLanguage, languages } from '../i18n.ts';

export const i18n = defineI18n({ defaultLanguage, languages, parser: 'dir' });
export const translations = i18n.translations().extend(uiTranslations()).add({
  en: { displayName: 'English' },
});
