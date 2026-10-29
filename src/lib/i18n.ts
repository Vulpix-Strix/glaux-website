// Languages published by the imported documentation. Site UI locales live in Paraglide
// (`src/paraglide/runtime`) and are independent of this list.
export const defaultLanguage = 'en';
export const languages = ['en'];

export function isPublishedLanguage(value: string | undefined): value is string {
  return value !== undefined && languages.includes(value);
}
