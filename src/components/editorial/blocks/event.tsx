import { useContext } from 'react';
import { calendarFile, type CalendarEvent } from '@/lib/editorial/calendar';
import { buttonClasses, SurfaceCard } from '@/components/site/primitives';
import { EditorialLanguage, useEditorialCopy } from '../context';
export function EventCard({ timeZone, ...event }: CalendarEvent & { timeZone: string }) {
  const lang = useContext(EditorialLanguage);
  const copy = useEditorialCopy();
  const formatter = new Intl.DateTimeFormat(lang === 'es' ? 'es-CL' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  });
  const calendar = calendarFile(event);
  return (
    <SurfaceCard className="not-prose my-8 p-6">
      <p className="mb-2 font-gx-pixel text-gx-accent uppercase">{copy.event}</p>
      <h3 className="text-xl font-semibold">{event.title}</h3>
      {event.description && <p className="mt-2 text-gx-muted">{event.description}</p>}
      <dl className="my-4 grid gap-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-gx-muted">{copy.start}</dt>
        <dd>
          <time dateTime={event.start}>{formatter.format(new Date(event.start))}</time> ({timeZone})
        </dd>
        <dt className="text-gx-muted">{copy.end}</dt>
        <dd>
          <time dateTime={event.end}>{formatter.format(new Date(event.end))}</time>
        </dd>
        <dt className="text-gx-muted">{copy.location}</dt>
        <dd>{event.location}</dd>
      </dl>
      <a
        className={buttonClasses}
        download="event.ics"
        href={`data:text/calendar;charset=utf-8,${encodeURIComponent(calendar)}`}
      >
        {copy.calendar}
      </a>
      {event.url && (
        <a className="ml-4 text-gx-accent underline" href={event.url}>
          {event.title}
        </a>
      )}
    </SurfaceCard>
  );
}
