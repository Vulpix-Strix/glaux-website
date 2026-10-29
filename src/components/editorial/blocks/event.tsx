import { calendarFile, type CalendarEvent } from '@/lib/editorial/calendar';
import { buttonClasses, SurfaceCard } from '@/components/site/primitives';
import { intlLocales } from '@/lib/editorial/format';
import { getLocale } from '@/paraglide/runtime';
import { m } from '@/paraglide/messages';
export function EventCard({ timeZone, ...event }: CalendarEvent & { timeZone: string }) {
  const formatter = new Intl.DateTimeFormat(intlLocales[getLocale()], {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  });
  const calendar = calendarFile(event);
  return (
    <SurfaceCard className="not-prose my-8 p-6">
      <p className="mb-2 font-gx-pixel text-gx-accent uppercase">{m.editorial_event()}</p>
      <h3 className="text-xl font-semibold">{event.title}</h3>
      {event.description && <p className="mt-2 text-gx-muted">{event.description}</p>}
      <dl className="my-4 grid gap-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-gx-muted">{m.editorial_start()}</dt>
        <dd>
          <time dateTime={event.start}>{formatter.format(new Date(event.start))}</time> ({timeZone})
        </dd>
        <dt className="text-gx-muted">{m.editorial_end()}</dt>
        <dd>
          <time dateTime={event.end}>{formatter.format(new Date(event.end))}</time>
        </dd>
        <dt className="text-gx-muted">{m.editorial_location()}</dt>
        <dd>{event.location}</dd>
      </dl>
      <a
        className={buttonClasses}
        download="event.ics"
        href={`data:text/calendar;charset=utf-8,${encodeURIComponent(calendar)}`}
      >
        {m.editorial_calendar()}
      </a>
      {event.url && (
        <a className="ml-4 text-gx-accent underline" href={event.url}>
          {event.title}
        </a>
      )}
    </SurfaceCard>
  );
}
