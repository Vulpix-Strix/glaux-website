import { createFileRoute } from '@tanstack/react-router';
import { catalog, getSource, isVersion } from '@/lib/docs/source';
import { createFromSource } from 'fumadocs-core/search/server';

type SearchServer = ReturnType<typeof createFromSource>;
const servers = new Map<string, SearchServer>();

/** One index per version, built on first use, so results never mix versions. */
function searchServer(version: string): SearchServer {
  let server = servers.get(version);
  if (!server) {
    server = createFromSource(getSource(version), {
      // https://docs.orama.com/docs/orama-js/supported-languages
      localeMap: { en: { language: 'english' } },
    });
    servers.set(version, server);
  }
  return server;
}

export const Route = createFileRoute('/api/search')({
  server: {
    handlers: {
      // The search dialog sends the version as `tag`. Without one, the recommended version is searched.
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const version = url.searchParams.get('tag') ?? catalog.default;
        if (!isVersion(version)) return new Response(null, { status: 400 });
        url.searchParams.delete('tag');
        return searchServer(version).GET(new Request(url, request));
      },
    },
  },
});
