import { useId } from 'react';
import { SurfaceCard } from '@/components/site/primitives';
export function Metric({
  label,
  value,
  unit,
  context,
}: {
  label: string;
  value: string | number;
  unit?: string;
  context?: string;
}) {
  return (
    <SurfaceCard className="not-prose my-6 p-6">
      <dl>
        <dt className="text-sm text-gx-muted">{label}</dt>
        <dd className="mt-2 font-gx-mono text-3xl">
          {value}
          {unit && <span className="ml-2 text-lg">{unit}</span>}
        </dd>
      </dl>
      {context && <p className="mt-3 text-sm text-gx-muted">{context}</p>}
    </SurfaceCard>
  );
}
export function Milestone({
  label,
  value,
  goal,
  context,
}: {
  label: string;
  value: number;
  goal: number;
  context?: string;
}) {
  const id = useId();
  if (!Number.isFinite(value) || !Number.isFinite(goal) || goal <= 0 || value < 0 || value > goal)
    throw new Error('Milestone requires 0 ≤ value ≤ goal and a positive goal');
  return (
    <SurfaceCard className="not-prose my-6 p-6">
      <label htmlFor={id} className="block font-semibold">
        {label}
      </label>
      <p className="my-3 font-gx-mono text-2xl">
        {value} / {goal}
      </p>
      <meter id={id} min={0} max={goal} value={value} className="h-4 w-full">
        {value} / {goal}
      </meter>
      {context && <p className="mt-3 text-sm text-gx-muted">{context}</p>}
    </SurfaceCard>
  );
}
