import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';
import { isPublishedLanguage } from '@/lib/i18n';

export const Route = createFileRoute('/$lang')({
  beforeLoad: ({ params }) => {
    if (!isPublishedLanguage(params.lang)) throw notFound();
  },
  component: Outlet,
});
