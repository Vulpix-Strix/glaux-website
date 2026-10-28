import { createFileRoute, Link } from '@tanstack/react-router';
import { SiteLayout } from '@/components/layouts/site';
import { absoluteUrl } from '@/lib/site';

export const Route = createFileRoute('/$lang/')({
  component: Home,
  head: ({ params }) => ({
    meta: [{ title: 'Glaux' }, { name: 'description', content: 'Glaux fantasy console documentation.' }],
    links: [{ rel: 'canonical', href: absoluteUrl(`/${params.lang}`) }],
  }),
});

function Home() {
  const { lang } = Route.useParams();

  return (
    <SiteLayout>
      <div className="flex flex-col flex-1 justify-center px-4 py-8 text-center">
        <h1 className="font-medium text-xl mb-4">Glaux documentation (proof of concept)</h1>
        <Link
          to="/$lang/docs/$"
          params={{ lang, _splat: 'guide' }}
          className="px-3 py-2 rounded-lg bg-fd-primary text-fd-primary-foreground font-medium text-sm mx-auto"
        >
          Open Docs
        </Link>
      </div>
    </SiteLayout>
  );
}
