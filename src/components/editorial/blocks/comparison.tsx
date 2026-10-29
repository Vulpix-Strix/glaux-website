import { useId, useState } from 'react';
import type { EditorialImage } from '@/lib/editorial/model';
import { m } from '@/paraglide/messages';
export function ImageComparison({
  before,
  after,
  initial = 50,
  label,
}: {
  before: EditorialImage;
  after: EditorialImage;
  initial?: number;
  label?: string;
}) {
  const id = useId();
  const [position, setPosition] = useState(Math.min(100, Math.max(0, initial)));
  return (
    <figure className="not-prose my-8">
      <div
        className="relative overflow-hidden rounded-lg border border-gx-border"
        style={before.width && before.height ? { aspectRatio: `${before.width}/${before.height}` } : undefined}
      >
        <img
          src={before.src}
          alt={before.alt}
          width={before.width}
          height={before.height}
          className="absolute inset-0 size-full object-contain"
        />
        <img
          src={after.src}
          alt={after.alt}
          width={after.width}
          height={after.height}
          className="absolute inset-0 size-full object-contain"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-gx-accent"
          style={{ left: `${position}%` }}
        />
        <div aria-hidden="true" className="absolute inset-x-3 bottom-3 flex justify-between">
          <span className="rounded-gx bg-gx-bg px-2 text-sm">{m.editorial_after()}</span>
          <span className="rounded-gx bg-gx-bg px-2 text-sm">{m.editorial_before()}</span>
        </div>
      </div>
      <label htmlFor={id} className="mt-3 block text-sm font-semibold">
        {label ?? m.editorial_compare()}
      </label>
      <input
        id={id}
        type="range"
        min="0"
        max="100"
        value={position}
        onChange={(event) => setPosition(Number(event.target.value))}
        aria-valuetext={`${m.editorial_after()}: ${position}%, ${m.editorial_before()}: ${100 - position}%`}
        className="min-h-11 w-full cursor-ew-resize accent-gx-accent"
      />
    </figure>
  );
}
