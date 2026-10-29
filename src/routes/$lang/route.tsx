import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';
import { isLocale } from '@/paraglide/runtime';

export const Route = createFileRoute('/$lang')({
  beforeLoad: ({ params }) => {
    if (!isLocale(params.lang)) throw notFound();
  },
  component: Outlet,
});
