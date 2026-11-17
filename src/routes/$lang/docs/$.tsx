import { createFileRoute, notFound, redirect, useRouterState } from '@tanstack/react-router';
import { DocsLayout } from '@/components/layouts/docs';
import { createServerFn } from '@tanstack/react-start';
import { catalog, docsPages, getDocsEntry, getSource, pageId } from '@/lib/docs/source';
import { resolveDocsPath, versionOptions } from '@/lib/docs/versions';
import { DEVELOPMENT } from '@/lib/glaux/catalog';
import {
  DocsBody,
  DocsPage,
  DocsTitle,
  EditOnGitHub,
  MarkdownCopyButton,
} from 'fumadocs-ui/layouts/docs/page';
import { isPublishedLanguage } from '@/lib/i18n';
import { appName } from '@/lib/site';
import { getPageMarkdownUrl } from '@/lib/docs/urls';
import { pageHead } from '@/lib/landing/metadata';
import { isLocale } from '@/paraglide/runtime';
import { m } from '@/paraglide/messages';
import { useFumadocsLoader } from 'fumadocs-core/source/client';
import { Suspense, use } from 'react';
import { useMDXComponents } from '@/components/docs/mdx';

declare module '@tanstack/react-router' {
  interface HistoryState {
    /** Title of the page the reader left because the version they chose does not have it. */
    missingPage?: string;
  }
}

export const Route = createFileRoute('/$lang/docs/$')({
  component: Page,
  loader: async ({ params }) => {
    const slugs = params._splat?.split('/').filter(Boolean) ?? [];
    const data = await serverLoader({ data: { slugs, lang: params.lang } });
    await getDocsEntry(data.version, data.path)?.preload();
    return data;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData || !isLocale(params.lang)) return {};
    return pageHead(params.lang, loaderData.pagePath, {
      title: `${loaderData.title} | ${appName}`,
      description: loaderData.description ?? loaderData.title,
      languages: ['en'],
    });
  },
});

const repositoryPage = catalog.repository.replace(/\.git$/, '');

const serverLoader = createServerFn({
  method: 'GET',
})
  .validator((params: { slugs: string[]; lang: string }) => params)
  .handler(async ({ data: { slugs, lang } }) => {
    if (!isPublishedLanguage(lang)) throw notFound();
    const target = resolveDocsPath(catalog, slugs, docsPages(lang));
    if (target.kind === 'not-found') throw notFound();
    if (target.kind === 'redirect') throw redirect({ href: ['', lang, 'docs', ...target.segments].join('/'), statusCode: 307 });

    const { version } = target;
    const page = getSource(version).getPage(target.slugs, lang)!;
    const pages = docsPages(lang);
    const versions = versionOptions(
      catalog,
      pageId(page.path),
      (v, id) => getSource(v).getPages(lang).find((other) => pageId(other.path) === id)?.url,
      (v) => ['', lang, 'docs', v, ...(pages.home(v) ?? [])].join('/'),
    );
    const commit = catalog.versions.find((v) => v.id === version)!.commit;

    return {
      version,
      versions,
      path: page.path,
      title: page.data.title,
      description: page.data.description,
      pagePath: page.url.slice(`/${lang}`.length),
      markdownUrl: getPageMarkdownUrl({ slugs: [version, ...page.slugs], locale: lang }).url,
      // Development follows `main`, where the page can be edited. A release is fixed at its commit.
      sourceUrl: `${repositoryPage}/blob/${version === DEVELOPMENT ? 'main' : commit}/docs/${page.path}`,
      pageTree: await getSource(version).serializePageTree(getSource(version).getPageTree(lang)),
    };
  });

interface ContentProps {
  version: string;
  path: string;
  markdownUrl: string;
  sourceUrl: string;
}

function Content({ version, path, markdownUrl, sourceUrl }: ContentProps) {
  const page = getDocsEntry(version, path);
  if (!page) throw new Error(`unknown page: ${version}/${path}`);
  const missingPage = useRouterState({ select: (state) => state.location.state.missingPage });
  const components = useMDXComponents();
  const { Callout } = components;
  const versionName = version === DEVELOPMENT ? m.docs_version_development() : version;

  const { toc } = use(page.load());
  const MDX = page.body;

  // The page's summary is the first paragraph of its body, so no description is shown here.
  return (
    <DocsPage toc={toc} breadcrumb={{ enabled: true, includeRoot: true }}>
      <DocsTitle>{page.title}</DocsTitle>
      <div className="gx-docs-meta">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <EditOnGitHub href={sourceUrl}>
          {version === DEVELOPMENT ? m.docs_source_edit() : m.docs_source_view({ version })}
        </EditOnGitHub>
      </div>
      {missingPage && (
        <Callout type="info" title={m.docs_notice_missing_title()} data-kind="note">
          {m.docs_notice_missing({ page: missingPage, version: versionName })}
        </Callout>
      )}
      {version === DEVELOPMENT && (
        <Callout type="warn" title={m.docs_notice_development_title()} data-kind="warning">
          {m.docs_notice_development()}
        </Callout>
      )}
      <DocsBody>
        <MDX components={components} />
      </DocsBody>
    </DocsPage>
  );
}

function Page() {
  const { version, versions, title, path, pageTree, markdownUrl, sourceUrl } = useFumadocsLoader(Route.useLoaderData());

  return (
    <DocsLayout tree={pageTree} version={version} versions={versions} pageTitle={title}>
      <Suspense>
        <Content version={version} path={path} markdownUrl={markdownUrl} sourceUrl={sourceUrl} />
      </Suspense>
    </DocsLayout>
  );
}
