import { createMiddleware, createCsrfMiddleware, createStart } from '@tanstack/react-start';
import { isMarkdownPreferred } from 'fumadocs-core/negotiation';
import { redirect } from '@tanstack/react-router';
import { isPublishedLanguage } from '@/lib/i18n';
import { getPageMarkdownUrl } from '@/lib/docs/urls';

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
});

const llmMiddleware = createMiddleware().server(({ next, request }) => {
  const url = new URL(request.url);

  // /<lang>/docs/<slugs>
  const [lang, section, ...slugs] = url.pathname.split('/').filter((v) => v.length > 0);
  if (isPublishedLanguage(lang) && section === 'docs' && !url.pathname.endsWith('.md') && isMarkdownPreferred(request)) {
    url.pathname = getPageMarkdownUrl({ slugs, locale: lang }).url;

    // this URL has two representations, selected by `Accept`
    throw redirect({ href: url.href, headers: { Vary: 'Accept' } });
  }

  return next();
});

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [csrfMiddleware, llmMiddleware],
  };
});
