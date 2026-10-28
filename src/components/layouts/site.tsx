import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { appName } from '@/lib/site';

export function SiteLayout({ children }: { children: ReactNode }) {
  return <HomeLayout nav={{ title: appName }}>{children}</HomeLayout>;
}
