import { useEffect, useState } from 'react';
import type { LicenseText } from '@/lib/credits/glaux';
import { loadTexts, type TextsSource } from '@/lib/credits/data';
import type { CreditsCopy } from '@/lib/credits/copy';

export function LicenseTexts({ source, ids, copy }: { source: TextsSource; ids: number[]; copy: CreditsCopy['libraries'] }) {
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
      <p className="gx-credits-status" role="status">
        {copy.textsFailed}{' '}
        <button type="button" className="gx-credits-link" onClick={() => { setTexts(null); setAttempt(attempt + 1); }}>{copy.retry}</button>
      </p>
    );
  }
  if (!texts) return <p className="gx-credits-status" role="status">{copy.textsLoading}</p>;
  return (
    <div className="gx-credits-texts">
      {ids.map((id) => (
        <figure key={id}>
          <figcaption>{texts[id].title}</figcaption>
          <pre tabIndex={0} aria-label={texts[id].title}>{texts[id].content}</pre>
        </figure>
      ))}
    </div>
  );
}
