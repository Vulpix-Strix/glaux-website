import { type ComponentProps } from 'react';
import { useSurfaceTheme } from '@/components/site/use-surface-theme';
import { DocsLayout as FumadocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsTopbar, DrawerLinks, HomeLink } from '@/components/docs/topbar';
import { ScriptLanguageToggle } from '@/components/docs/script-language';
import { VersionSelect } from '@/components/docs/version-select';
import type { VersionOption } from '@/lib/docs/versions';

export function DocsLayout({
  tree,
  version,
  versions,
  pageTitle,
  children,
}: Pick<ComponentProps<typeof FumadocsLayout>, 'tree' | 'children'> & {
  version: string;
  versions: VersionOption[];
  pageTitle: string;
}) {
  useSurfaceTheme();
  return (
    <FumadocsLayout
      tree={tree}
      tabs={false}
      slots={{ header: DocsTopbar, navTitle: HomeLink }}
      sidebar={{
        banner: (
          <>
            <DrawerLinks />
            <VersionSelect version={version} versions={versions} pageTitle={pageTitle} />
            <ScriptLanguageToggle />
          </>
        ),
      }}
      containerProps={{ className: 'glaux-theme gx-docs' }}
    >
      {children}
    </FumadocsLayout>
  );
}
