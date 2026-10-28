export const appName = 'Glaux';
export const siteUrl = 'https://glauxconsole.dev';

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl).href;
}
