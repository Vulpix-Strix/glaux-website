import type { ReactNode } from 'react';
import { Banner } from 'fumadocs-ui/components/banner';
import type { EditorialImage } from '@/lib/editorial/model';
import { SurfaceCard } from '@/components/site/primitives';
import { m } from '@/paraglide/messages';
export function ArticleFigure({ caption, ...image }: EditorialImage) {
  return (
    <figure className="my-8">
      <img {...image} loading="lazy" className="h-auto w-full rounded-gx border border-gx-border" />
      {caption && <figcaption className="mt-3 text-sm text-gx-muted">{caption}</figcaption>}
    </figure>
  );
}
export function EditorialNotice({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <Banner
      variant="normal"
      changeLayout={false}
      className="relative! h-auto! min-h-11 flex-wrap gap-2 border-y border-gx-warning bg-gx-warning-subtle! py-3 text-gx-warning-text!"
      role="note"
    >
      <strong>{m.editorial_notice()}</strong>
      <span>{children}</span>
    </Banner>
  );
}
export function ResourceCard({
  href,
  title,
  children,
  image,
}: {
  href: string;
  title: string;
  children?: ReactNode;
  image?: EditorialImage;
}) {
  return (
    <SurfaceCard className="not-prose my-6 overflow-hidden">
      {image && (
        <img
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="lazy"
          className="aspect-video w-full object-cover"
        />
      )}
      <div className="p-5">
        <h3 className="text-xl font-semibold">
          <a href={href} className="text-gx-accent hover:underline">
            {title}
          </a>
        </h3>
        {children && <div className="mt-2 text-gx-muted">{children}</div>}
      </div>
    </SurfaceCard>
  );
}
export const GameCard = ResourceCard;
