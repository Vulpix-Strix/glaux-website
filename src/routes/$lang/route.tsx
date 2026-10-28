import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';
import { isLandingLanguage } from '@/lib/i18n';

export const Route = createFileRoute('/$lang')({
  beforeLoad: ({ params }) => {
    if (!isLandingLanguage(params.lang)) throw notFound();
  },
  component: Outlet,
});
