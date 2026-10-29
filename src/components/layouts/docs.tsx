import { useEffect, type ComponentProps } from 'react';
import { DocsLayout as FumadocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsTopbar, DrawerLinks, HomeLink } from '@/components/docs/topbar';
import { ScriptLanguageToggle } from '@/components/docs/script-language';

/** Fumadocs portals dialogs to <body>, outside the layout; give them the theme while the docs are open. */
function useGlauxThemeOnBody() {
  useEffect(() => {
    document.body.classList.add('glaux-theme');
    return () => document.body.classList.remove('glaux-theme');
  }, []);
}

export function DocsLayout({ tree, children }: Pick<ComponentProps<typeof FumadocsLayout>, 'tree' | 'children'>) {
  useGlauxThemeOnBody();
  return (
    <FumadocsLayout
      tree={tree}
      tabs={false}
      slots={{ header: DocsTopbar, navTitle: HomeLink }}
      sidebar={{ banner: <><DrawerLinks /><ScriptLanguageToggle /></> }}
      containerProps={{ className: 'glaux-theme gx-docs' }}
    >
      {children}
    </FumadocsLayout>
  );
}
