import { use, Suspense } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { articles } from 'virtual:editorial';
import { EditorialArticle } from '@/components/editorial/article';
import { articleHead } from '@/lib/editorial/metadata';
import { articleLoader, loadArticleBody } from '@/lib/editorial/loader';

export const Route = createFileRoute('/$lang/blog/$slug')({
  loader: articleLoader('blog'),
  head: ({ loaderData }) => (loaderData ? articleHead(loaderData.article, articles) : {}),
  component: () => (
    <Suspense>
      <Page />
    </Suspense>
  ),
});
function Page() {
  const { article } = Route.useLoaderData();
  const body = use(loadArticleBody(article));
  return <EditorialArticle article={article} body={body.default} toc={body.toc} />;
}
