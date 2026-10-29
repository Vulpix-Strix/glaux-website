import { createFileRoute } from '@tanstack/react-router';
import { CreditsPage } from '@/components/credits/page';
import { m } from '@/paraglide/messages';
import { isLocale } from '@/paraglide/runtime';
import { pageHead } from '@/lib/landing/metadata';
import editorial from 'virtual:credits-editorial';
import creditsCss from '@/styles/credits.css?url';
import landingCss from '@/styles/landing.css?url';

export const Route = createFileRoute('/$lang/credits')({
  component: Credits,
  head: ({ params }) => {
    const lang = isLocale(params.lang) ? params.lang : 'en';
    const head = pageHead(lang, '/credits', {
      title: m.credits_title({}, { locale: lang }),
      description: m.credits_description({}, { locale: lang }),
    });
    return { ...head, links: [...head.links, { rel: 'stylesheet', href: landingCss }, { rel: 'stylesheet', href: creditsCss }] };
  },
});

function Credits() {
  const { lang } = Route.useParams();
  return <CreditsPage lang={isLocale(lang) ? lang : 'en'} editorial={editorial} />;
}
