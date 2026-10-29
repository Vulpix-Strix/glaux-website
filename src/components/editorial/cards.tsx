import type { Article } from '@/lib/editorial/model';
import { articleUrl } from '@/lib/editorial/model';
import { EventCard } from './blocks/event';
import { formatArticleDate } from '@/lib/editorial/format';
import { m } from '@/paraglide/messages';

const categoryColors = {
  announcements: 'bg-gx-accent-subtle text-gx-accent',
  development: 'bg-gx-success-subtle text-gx-success-text',
  community: 'bg-gx-danger-subtle text-gx-danger-text',
  showcases: 'bg-gx-warning-subtle text-gx-warning-text',
  devlog: 'bg-gx-success-subtle text-gx-success-text',
  technical: 'bg-gx-accent-subtle text-gx-accent',
  design: 'bg-gx-warning-subtle text-gx-warning-text',
  lessons: 'bg-gx-danger-subtle text-gx-danger-text',
};

export function ArticleMeta({
  article,
  showWords = false,
}: {
  article: Article;
  showWords?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gx-muted">
      {article.author && <span>{article.author}</span>}
      {article.date && (
        <time dateTime={article.date}>{formatArticleDate(article.date, article.lang)}</time>
      )}
      <span>
        {article.minutes} {m.editorial_minutes()}
      </span>
      {showWords && (
        <span>
          {article.words} {m.editorial_words()}
        </span>
      )}
    </div>
  );
}
export function ArticleTags({ article }: { article: Article }) {
  return (
    <div className="flex flex-wrap gap-2">
      {article.categories.map((category) => (
        <a
          key={category}
          href={`/${article.lang}/${article.section}?category=${category}`}
          className={`inline-flex min-h-7 items-center rounded-gx border border-gx-border px-2 text-xs font-semibold hover:underline ${categoryColors[category]}`}
        >
          {m[`editorial_topics_${category}`]()}
        </a>
      ))}
    </div>
  );
}
export function ArticleCard({
  article,
  featured = false,
  compact = false,
  className = '',
}: {
  article: Article;
  featured?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const layout = featured
    ? 'shadow-gx-pixel min-[900px]:grid min-[900px]:grid-cols-[1.35fr_1fr]'
    : compact
      ? 'sm:grid sm:grid-cols-[minmax(0,1fr)_2fr]'
      : '';
  return (
    <article
      className={`min-w-0 overflow-hidden rounded-lg border bg-gx-surface ${featured ? 'border-gx-border-strong' : 'border-gx-border'} ${layout} ${className}`}
    >
      {article.cover && (
        <a
          href={articleUrl(article)}
          tabIndex={-1}
          aria-hidden="true"
          className="block min-w-0 overflow-hidden bg-gx-sunken"
        >
          <img
            src={article.cover.src}
            alt=""
            width={article.cover.width}
            height={article.cover.height}
            loading={featured ? 'eager' : 'lazy'}
            className={`size-full object-cover ${compact ? 'aspect-4/3' : 'aspect-video'}`}
          />
        </a>
      )}
      <div
        className={`flex flex-col items-start justify-center gap-4 ${featured ? 'p-6 sm:p-10' : 'p-5'}`}
      >
        <ArticleTags article={article} />
        {article.number && (
          <span className="font-gx-pixel text-lg text-gx-muted">#{article.number}</span>
        )}
        <h2
          className={`text-balance font-semibold tracking-tight ${featured ? 'text-3xl leading-tight sm:text-4xl' : 'text-xl leading-7'}`}
        >
          <a className="hover:text-gx-accent hover:underline" href={articleUrl(article)}>
            {article.title}
          </a>
        </h2>
        {!compact && <p className="text-gx-muted">{article.description}</p>}
        <ArticleMeta article={article} />
        {featured && (
          <a href={articleUrl(article)} className="font-semibold text-gx-accent hover:underline">
            {m.editorial_read()} →
          </a>
        )}
        {article.presentation === 'event' && article.event && (
          <EventCard title={article.title} {...article.event} />
        )}
      </div>
    </article>
  );
}
