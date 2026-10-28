import { SiteLayout } from './layouts/site';
import { DefaultNotFound } from 'fumadocs-ui/layouts/home/not-found';

export function NotFound() {
  return <SiteLayout><DefaultNotFound /></SiteLayout>;
}
