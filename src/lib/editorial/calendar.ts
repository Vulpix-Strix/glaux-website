export interface CalendarEvent {
  title: string;
  start: string;
  end: string;
  location: string;
  description?: string;
  url?: string;
}
const escape = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
function timestamp(value: string) {
  if (!/(Z|[+-]\d\d:\d\d)$/.test(value) || !Number.isFinite(Date.parse(value)))
    throw new Error('Calendar dates require an explicit UTC offset');
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}
// RFC 5545 lines are folded at octet boundaries, without splitting UTF-8 characters.
function fold(line: string) {
  let output = '';
  let bytes = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > 75) {
      output += '\r\n ';
      bytes = 1;
    }
    output += char;
    bytes += size;
  }
  return output;
}
export function calendarFile(event: CalendarEvent) {
  const start = timestamp(event.start);
  const end = timestamp(event.end);
  if (end <= start) throw new Error('Calendar event end must follow its start');
  const uid = `${encodeURIComponent(event.title)}-${start}@glauxconsole.dev`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Glaux//Editorial//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${start}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escape(event.title)}`,
    `LOCATION:${escape(event.location)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escape(event.description)}`);
  if (event.url) lines.push(`URL:${escape(event.url)}`);
  return [...lines, 'END:VEVENT', 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
}
