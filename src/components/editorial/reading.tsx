import { useEffect, useState } from 'react';
import { Button } from '@/components/site/primitives';
import { m } from '@/paraglide/messages';
import { track } from '@/lib/posthog';
import type { EditorialSection } from '@/lib/editorial/model';

export function ReadingProgress({ title }: { title: string }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    function measure() {
      frame = 0;
      const article = document.getElementById('article-body');
      if (!article) return;
      const rect = article.getBoundingClientRect();
      const distance = rect.height - window.innerHeight;
      setProgress(
        Math.round(
          Math.min(
            100,
            Math.max(0, distance > 0 ? (-rect.top / distance) * 100 : rect.top <= 0 ? 100 : 0),
          ),
        ),
      );
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(measure);
    }
    const observer = new ResizeObserver(schedule);
    const article = document.getElementById('article-body');
    if (article) observer.observe(article);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);
  return (
    <div className="sticky top-0 z-20 flex min-h-12 items-center gap-4 border-b border-gx-border bg-gx-bg px-5 sm:px-8">
      <span className="max-w-[34ch] truncate text-sm font-semibold text-gx-muted max-sm:hidden">
        {title}
      </span>
      <progress
        aria-label={m.editorial_progress()}
        max={100}
        value={progress}
        className="gx-reading-progress h-2 min-w-0 flex-1"
      />
      <span className="font-gx-mono text-xs text-gx-muted">{progress}%</span>
    </div>
  );
}
export function ShareArticle({
  url,
  title,
  section,
  slug,
}: {
  url: string;
  title: string;
  section: EditorialSection;
  slug: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    if (state !== 'copied') return;
    const timer = setTimeout(() => setState('idle'), 2500);
    return () => clearTimeout(timer);
  }, [state]);
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      track('article_shared', { article_type: section, slug, method: 'copy_link' });
      setState('copied');
    } catch {
      setState('failed');
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={copyLink}>{m.editorial_copy()}</Button>
      <a
        className="inline-flex min-h-11 items-center text-sm text-gx-accent underline"
        href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`}
        onClick={() => track('article_shared', { article_type: section, slug, method: 'email' })}
      >
        {m.editorial_email()}
      </a>
      <span role="status" className="text-sm text-gx-muted">
        {state === 'copied' ? m.editorial_copied() : ''}
      </span>
      {state === 'failed' && (
        <label className="w-full text-sm">
          {m.editorial_copy_failed()}
          <input
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
            className="mt-2 block w-full rounded-gx border border-gx-border bg-gx-surface p-2"
          />
        </label>
      )}
    </div>
  );
}
