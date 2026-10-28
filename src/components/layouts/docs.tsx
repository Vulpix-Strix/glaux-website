import type { ComponentProps } from 'react';
import { DocsLayout as FumadocsLayout } from 'fumadocs-ui/layouts/docs';
import { appName } from '@/lib/site';

export function DocsLayout({ tree, children }: Pick<ComponentProps<typeof FumadocsLayout>, 'tree' | 'children'>) {
  return <FumadocsLayout nav={{ title: appName, url: '/en' }} tree={tree}>{children}</FumadocsLayout>;
}
