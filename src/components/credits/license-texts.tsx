import { useEffect, useState } from 'react';
import type { LicenseText } from '@/lib/credits/glaux';
import { loadTexts, type TextsSource } from '@/lib/credits/data';
import { m } from '@/paraglide/messages';

export function LicenseTexts({
  source,
  ids,
}: {
  source: TextsSource;
  ids: number[];
}) {
  const [texts, setTexts] = useState<LicenseText[] | 'failed' | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    loadTexts(source).then(
      (loaded) => current && setTexts(loaded),
      () => current && setTexts('failed'),
    );
    return () => {
      current = false;
    };
  }, [source, attempt]);

  if (texts === 'failed') {
    return (
      <p className="gx-credits-status px-4 py-8 text-center" role="status">
        {m.credits_libraries_texts_failed()}{' '}
        <button
          type="button"
          className="gx-credits-link"
          onClick={() => {
            setTexts(null);
            setAttempt(attempt + 1);
          }}
        >
          {m.credits_libraries_retry()}
        </button>
      </p>
    );
  }
  if (!texts)
    return (
      <p className="gx-credits-status px-4 py-8 text-center" role="status">
        {m.credits_libraries_texts_loading()}
      </p>
    );
  return (
    <div className="gx-credits-texts mt-4 grid gap-4">
      {ids.map((id) => (
        <figure key={id}>
          <figcaption>{texts[id].title}</figcaption>
          <pre tabIndex={0} aria-label={texts[id].title}>
            {texts[id].content}
          </pre>
        </figure>
      ))}
    </div>
  );
}
