import { createFileRoute } from '@tanstack/react-router';
import { LandingPage } from '@/components/landing/page';
import { isLocale } from '@/paraglide/runtime';
import { landingHead } from '@/lib/landing/metadata';
import landingCss from '@/styles/landing.css?url';

export const Route = createFileRoute('/$lang/')({
  component: Home,
  head: ({ params }) => {
    const head = landingHead(isLocale(params.lang) ? params.lang : 'en');
    return { ...head, links: [...head.links, { rel: 'stylesheet', href: landingCss }] };
  },
});

function Home() {
  const { lang } = Route.useParams();
  return <LandingPage lang={isLocale(lang) ? lang : 'en'} />;
}
