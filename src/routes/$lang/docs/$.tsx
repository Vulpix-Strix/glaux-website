import { createFileRoute, notFound } from '@tanstack/react-router';
import { DocsLayout } from '@/components/layouts/docs';
import { createServerFn } from '@tanstack/react-start';
import { docs, source } from '@/lib/docs/source';
import {
  DocsBody,
  DocsPage,
  DocsTitle,
  EditOnGitHub,
  MarkdownCopyButton,
} from 'fumadocs-ui/layouts/docs/page';
import { isPublishedLanguage } from '@/lib/i18n';
import { absoluteUrl, appName } from '@/lib/site';
import { repositoryUrl } from '@/lib/site-nav';
import { getPageImageUrl, getPageMarkdownUrl } from '@/lib/docs/urls';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { Suspense, use } from 'react';
import { useMDXComponents } from '@/components/docs/mdx';

export const Route = createFileRoute('/$lang/docs/$')({
  component: Page,
  loader: async ({ params }) => {
    const slugs = params._splat?.split('/') ?? [];
    const data = await serverLoader({ data: { slugs, lang: params.lang } });
    await docs.getPage(data.path)?.preload();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.title} | ${appName}` },
      { name: 'description', content: loaderData.description },
      { property: 'og:image', content: loaderData.imageUrl },
    ] : [],
    links: loaderData ? [{ rel: 'canonical', href: loaderData.canonicalUrl }] : [],
  }),
});

const serverLoader = createServerFn({
  method: 'GET',
})
  .validator((params: { slugs: string[]; lang: string }) => params)
  .handler(async ({ data: { slugs, lang } }) => {
    if (!isPublishedLanguage(lang)) throw notFound();
    const page = source.getPage(slugs, lang);
    if (!page) throw notFound();

    return {
      path: page.path,
      title: page.data.title,
      description: page.data.description,
      canonicalUrl: absoluteUrl(page.url),
      markdownUrl: getPageMarkdownUrl(page).url,
      imageUrl: absoluteUrl(getPageImageUrl(page).url),
      pageTree: await source.serializePageTree(source.getPageTree(lang)),
    };
  });

function Content({ path, markdownUrl }: { path: string; markdownUrl: string }) {
  const page = docs.getPage(path);
  if (!page) throw new Error(`unknown page: ${path}`);

  const { toc } = use(page.load());
  const MDX = page.body;

  // The page's summary is the first paragraph of its body, so no description is shown here.
  return (
    <DocsPage toc={toc} breadcrumb={{ enabled: true, includeRoot: true }}>
      <DocsTitle>{page.title}</DocsTitle>
      <div className="gx-docs-meta">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <EditOnGitHub href={`${repositoryUrl}/blob/main/docs/${path}`}>Edit on GitHub</EditOnGitHub>
      </div>
      <DocsBody>
        <MDX components={useMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

function Page() {
  const { path, pageTree, markdownUrl } = useFumadocsLoader(Route.useLoaderData());

  return (
    <DocsLayout tree={pageTree}>
      <Suspense>
        <Content path={path} markdownUrl={markdownUrl} />
      </Suspense>
    </DocsLayout>
  );
}
