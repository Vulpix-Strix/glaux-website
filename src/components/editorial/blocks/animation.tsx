import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/site/primitives';
import type { VideoSource } from './video';
import { pauseOnReducedMotion } from '@/lib/editorial/media';
import { m } from '@/paraglide/messages';
export function AnimatedClip({
  sources,
  poster,
  title,
}: {
  sources: VideoSource[];
  poster: string;
  title: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    return pauseOnReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)'), () =>
      video.current?.pause(),
    );
  }, []);
  async function toggle() {
    if (!video.current) return;
    if (playing) video.current.pause();
    else
      try {
        await video.current.play();
      } catch {
        setFailed(true);
      }
  }
  return (
    <figure className="not-prose my-8 rounded-lg border border-gx-border bg-gx-sunken p-4">
      <video
        ref={video}
        loop
        muted
        playsInline
        preload="none"
        poster={poster}
        aria-label={title}
        className="aspect-video w-full rounded-gx object-contain"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setFailed(true)}
      >
        {sources.map((source) => (
          <source key={source.src} {...source} />
        ))}
      </video>
      <figcaption className="my-3 font-semibold">{title}</figcaption>
      <Button onClick={toggle} aria-pressed={playing}>
        {playing ? m.editorial_pause() : m.editorial_play()}
      </Button>
      {failed && (
        <p role="status" className="mt-3">
          {m.editorial_media_error()}
        </p>
      )}
    </figure>
  );
}
