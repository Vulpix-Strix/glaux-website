export const defaultLanguage = 'en';
export const languages = ['en'];

export function isPublishedLanguage(value: string | undefined): value is string {
  return value !== undefined && languages.includes(value);
}

export function getLanguage(value: string | undefined): string {
  return isPublishedLanguage(value) ? value : defaultLanguage;
}
