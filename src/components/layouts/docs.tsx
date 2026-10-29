import { type ComponentProps } from 'react';
import { useSurfaceTheme } from '@/components/site/use-surface-theme';
import { DocsLayout as FumadocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsTopbar, DrawerLinks, HomeLink } from '@/components/docs/topbar';
import { ScriptLanguageToggle } from '@/components/docs/script-language';

export function DocsLayout({
  tree,
  children,
}: Pick<ComponentProps<typeof FumadocsLayout>, 'tree' | 'children'>) {
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
