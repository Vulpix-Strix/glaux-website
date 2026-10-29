import { defineI18n } from 'fumadocs-core/i18n';
import { uiTranslations } from 'fumadocs-ui/i18n';
import { defaultLanguage, landingLanguages } from './i18n.ts';

// Site UI locales are independent of the English-only imported manual.
export const siteTranslations = defineI18n({ defaultLanguage, languages: [...landingLanguages] })
  .translations()
  .extend(uiTranslations())
  .add({
    en: { displayName: 'English' },
    es: {
      displayName: 'Español',
      'Toggle Theme(theme switcher)(aria-label)': 'Cambiar tema',
      'Light(theme switcher)(aria-label)': 'Claro',
      'Dark(theme switcher)(aria-label)': 'Oscuro',
      'System(theme switcher)(aria-label)': 'Sistema',
      'Copy Text(code block)(aria-label)': 'Copiar texto',
      'Copied Text(code block)(aria-label)': 'Texto copiado',
      'Copy Anchor Link(heading anchor)(aria-label)': 'Copiar enlace a la sección',
      'Copied Anchor Link(heading anchor)(aria-label)': 'Enlace copiado',
      'Close Banner(banner)(aria-label)': 'Cerrar aviso',
      'Table of Contents(inline table of contents)': 'Índice',
      'Prop(type table)': 'Propiedad',
      'Type(type table)': 'Tipo',
      'Default(type table)': 'Valor predeterminado',
    },
  });
