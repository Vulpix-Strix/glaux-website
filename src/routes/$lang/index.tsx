import { createFileRoute } from '@tanstack/react-router';
import { LandingPage } from '@/components/landing/page';
import { isLandingLanguage } from '@/lib/i18n';
import { landingHead } from '@/lib/landing/metadata';
import landingCss from '@/styles/landing.css?url';

export const Route = createFileRoute('/$lang/')({
  component: Home,
  head: ({ params }) => {
    const head = landingHead(isLandingLanguage(params.lang) ? params.lang : 'en');
    return { ...head, links: [...head.links, { rel: 'stylesheet', href: landingCss }] };
  },
});

function Home() {
  const { lang } = Route.useParams();
  return <LandingPage lang={isLandingLanguage(lang) ? lang : 'en'} />;
}
