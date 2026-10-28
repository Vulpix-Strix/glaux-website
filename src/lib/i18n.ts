export const defaultLanguage = 'en';
// Languages published by the imported documentation, independent of the landing.
export const languages = ['en'];

export function isPublishedLanguage(value: string | undefined): value is string {
  return value !== undefined && languages.includes(value);
}

export function getLanguage(value: string | undefined): string {
  return isLandingLanguage(value) ? value : defaultLanguage;
}

// Site locales are independent of the languages available in the imported manual.
export const landingLanguages = ['en', 'es'] as const;
export type LandingLanguage = typeof landingLanguages[number];
export const isLandingLanguage = (value: string | undefined): value is LandingLanguage =>
  landingLanguages.some((language) => language === value);
