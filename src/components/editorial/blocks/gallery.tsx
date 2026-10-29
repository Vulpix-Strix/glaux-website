import { useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { EditorialImage } from '@/lib/editorial/model';
import { Button } from '@/components/site/primitives';
import { useEditorialCopy } from '../context';

export function ArticleGallery({ images, title }: { images: EditorialImage[]; title?: string }) {
  const copy = useEditorialCopy();
  const [index, setIndex] = useState<number | null>(null);
  const origin = useRef<HTMLButtonElement | null>(null);
  const image = index === null ? undefined : images[index];
  function move(offset: number) {
    setIndex((current) => Math.max(0, Math.min(images.length - 1, (current ?? 0) + offset)));
  }
  if (!images.length) return null;
  return (
    <section className="not-prose my-8" aria-label={title ?? copy.gallery}>
      {title && <h3 className="mb-4 text-xl font-semibold">{title}</h3>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((item, position) => (
          <button
            key={`${item.src}/${position}`}
            type="button"
            aria-label={`${copy.image} ${position + 1}: ${item.alt}`}
            aria-haspopup="dialog"
            className="cursor-zoom-in overflow-hidden rounded-gx border border-gx-border"
            onClick={(event) => {
              origin.current = event.currentTarget;
              setIndex(position);
            }}
          >
            <img
              src={item.src}
              alt={item.alt}
              width={item.width}
              height={item.height}
              loading="lazy"
              className="aspect-4/3 w-full object-cover"
            />
          </button>
        ))}
      </div>
      <Dialog.Root
        open={index !== null}
        onOpenChange={(open) => {
          if (!open) setIndex(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/80" />
          <Dialog.Popup
            finalFocus={origin}
            className="glaux-theme fixed inset-3 z-50 flex flex-col rounded-lg border border-gx-border bg-gx-bg p-4 font-gx-sans text-gx-text shadow-xl sm:inset-8"
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault();
                move(event.key === 'ArrowLeft' ? -1 : 1);
              }
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <Dialog.Title className="text-lg font-semibold">{title ?? copy.gallery}</Dialog.Title>
              <Dialog.Close render={<Button aria-label={copy.close} />}>
                <X size={20} />
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">{image?.alt}</Dialog.Description>
            {image && (
              <figure className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-4">
                <img
                  src={image.src}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  className="min-h-0 max-w-full flex-1 object-contain"
                />
                {image.caption && (
                  <figcaption className="text-center text-sm text-gx-muted">
                    {image.caption}
                  </figcaption>
                )}
              </figure>
            )}
            <div className="flex items-center justify-center gap-5">
              <Button
                disabled={index === 0}
                aria-label={copy.previousImage}
                onClick={() => move(-1)}
              >
                <ChevronLeft />
              </Button>
              <span
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="font-gx-mono text-sm"
              >
                {(index ?? 0) + 1} / {images.length}
              </span>
              <Button
                disabled={index === images.length - 1}
                aria-label={copy.nextImage}
                onClick={() => move(1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
