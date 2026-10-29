import { defineI18n } from 'fumadocs-core/i18n';
import { i18nProvider, uiTranslations } from 'fumadocs-ui/i18n';
import { baseLocale, locales, type Locale } from '../paraglide/runtime.js';
import { m } from '../paraglide/messages.js';

const i18n = defineI18n({ defaultLanguage: baseLocale, languages: [...locales] });

// Fumadocs UI strings, read from the Paraglide catalog for an explicit locale.
const strings = (locale: Locale) => {
  const options = { locale };
  return {
    displayName: m.fumadocs_display_name({}, options),
    'Toggle Theme(theme switcher)(aria-label)': m.fumadocs_toggle_theme({}, options),
    'Light(theme switcher)(aria-label)': m.fumadocs_theme_light({}, options),
    'Dark(theme switcher)(aria-label)': m.fumadocs_theme_dark({}, options),
    'System(theme switcher)(aria-label)': m.fumadocs_theme_system({}, options),
    'Copy Text(code block)(aria-label)': m.fumadocs_copy_text({}, options),
    'Copied Text(code block)(aria-label)': m.fumadocs_copied_text({}, options),
    'Copy Anchor Link(heading anchor)(aria-label)': m.fumadocs_copy_anchor({}, options),
    'Copied Anchor Link(heading anchor)(aria-label)': m.fumadocs_copied_anchor({}, options),
    'Close Banner(banner)(aria-label)': m.fumadocs_close_banner({}, options),
    'Table of Contents(inline table of contents)': m.fumadocs_inline_toc({}, options),
    'Prop(type table)': m.fumadocs_type_prop({}, options),
    'Type(type table)': m.fumadocs_type_type({}, options),
    'Default(type table)': m.fumadocs_type_default({}, options),
  };
};

export const siteI18nProvider = (locale: Locale) =>
  i18nProvider(
    i18n
      .translations()
      .extend(uiTranslations())
      .add(Object.fromEntries(locales.map((item) => [item, strings(item)])) as Record<Locale, ReturnType<typeof strings>>),
    locale,
  );
