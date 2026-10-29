import { useId, useRef, useState } from 'react';
import { Button } from '@/components/site/primitives';
import { useEditorialCopy } from '../context';
export interface VideoSource {
  src: string;
  type: string;
}
export interface VideoTrack {
  src: string;
  srcLang: string;
  label: string;
  default?: boolean;
}
export interface Chapter {
  time: number;
  title: string;
}
export function ArticleVideo({
  sources,
  poster,
  title,
  tracks = [],
  transcript,
  chapters = [],
}: {
  sources: VideoSource[];
  poster?: string;
  title: string;
  tracks?: VideoTrack[];
  transcript?: string;
  chapters?: Chapter[];
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const copy = useEditorialCopy();
  const id = useId();
  return (
    <figure className="not-prose my-8 overflow-hidden rounded-lg border border-gx-border bg-gx-sunken">
      <video
        ref={(element) => {
          video.current = element;
          if (element && element.readyState >= 1) setReady(true);
        }}
        onLoadedMetadata={() => setReady(true)}
        controls
        playsInline
        preload="metadata"
        poster={poster}
        aria-label={title}
        aria-describedby={id}
        className="aspect-video w-full"
        onError={() => setFailed(true)}
      >
        {sources.map((source) => (
          <source key={source.src} {...source} />
        ))}
        {tracks.map((track) => (
          <track key={track.src} kind="captions" {...track} />
        ))}
      </video>
      <figcaption id={id} className="p-4 font-semibold">
        {title}
      </figcaption>
      {failed && (
        <p role="status" className="px-4 pb-4">
          {copy.mediaError}
        </p>
      )}
      {chapters.length > 0 && (
        <nav aria-label={copy.chapters} className="flex flex-wrap gap-2 px-4 pb-4">
          {chapters.map((chapter) => (
            <Button
              key={chapter.time}
              disabled={!ready || failed}
              onClick={() => {
                if (video.current) video.current.currentTime = chapter.time;
              }}
            >
              {Math.floor(chapter.time / 60)}:{String(chapter.time % 60).padStart(2, '0')}{' '}
              {chapter.title}
            </Button>
          ))}
        </nav>
      )}
      {transcript && (
        <details className="border-t border-gx-border p-4">
          <summary className="cursor-pointer font-semibold">{copy.transcript}</summary>
          <p className="mt-3 whitespace-pre-line text-gx-muted">{transcript}</p>
        </details>
      )}
    </figure>
  );
}
