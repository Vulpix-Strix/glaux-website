import type { ComponentProps, ReactNode } from 'react';

export const buttonClasses =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-gx border border-gx-border-strong bg-gx-raised px-4 text-center font-gx-sans text-sm leading-5 font-semibold text-gx-text transition-colors hover:bg-gx-hover active:translate-y-px disabled:cursor-not-allowed disabled:border-dashed disabled:bg-gx-sunken disabled:text-gx-muted disabled:shadow-none disabled:transform-none';
export function Button(props: ComponentProps<'button'>) {
  return (
    <button type="button" {...props} className={`${buttonClasses} ${props.className ?? ''}`} />
  );
}
export function Container({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-site px-5 min-[601px]:px-8 ${className}`}>{children}</div>
  );
}
export function SurfaceCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-lg border border-gx-border bg-gx-surface ${className}`}>
      {children}
    </div>
  );
}
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 font-gx-pixel text-lg leading-6 text-gx-accent uppercase">{children}</p>
  );
}
