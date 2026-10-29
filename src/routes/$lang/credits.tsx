import { createFileRoute } from '@tanstack/react-router';
import { CreditsPage } from '@/components/credits/page';
import { creditsCopy } from '@/lib/credits/copy';
import { isLandingLanguage } from '@/lib/i18n';
import { pageHead } from '@/lib/landing/metadata';
import editorial from 'virtual:credits-editorial';
import creditsCss from '@/styles/credits.css?url';
import landingCss from '@/styles/landing.css?url';

export const Route = createFileRoute('/$lang/credits')({
  component: Credits,
  head: ({ params }) => {
    const lang = isLandingLanguage(params.lang) ? params.lang : 'en';
    const head = pageHead(lang, '/credits', creditsCopy[lang]);
    return { ...head, links: [...head.links, { rel: 'stylesheet', href: landingCss }, { rel: 'stylesheet', href: creditsCss }] };
  },
});

function Credits() {
  const { lang } = Route.useParams();
  return <CreditsPage lang={isLandingLanguage(lang) ? lang : 'en'} editorial={editorial} />;
}
