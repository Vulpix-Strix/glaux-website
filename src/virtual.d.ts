declare module 'virtual:credits-editorial' {
  import type { EditorialFile } from '@/lib/credits/data';
  const editorial: EditorialFile;
  export default editorial;
}


declare module 'virtual:editorial' {
  import type { Article } from '@/lib/editorial/model';
  import type { ComponentType } from 'react';
  import type { MDXProps } from 'mdx/types';
  import type { TOCItemType } from 'fumadocs-core/toc';
  export const articles: Article[];
  export const articleModules: Record<string, () => Promise<{ default: ComponentType<MDXProps>; toc: TOCItemType[] }>>;
}

interface ImportMetaEnv {
  readonly VITE_PUBLIC_POSTHOG_PROJECT_TOKEN?: string;
  readonly VITE_PUBLIC_POSTHOG_HOST?: string;
}
