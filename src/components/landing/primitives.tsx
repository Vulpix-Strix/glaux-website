import { useState, type ReactNode } from 'react';
import { buttonClasses } from '@/components/site/primitives';

export function Action({
  href,
  children,
  primary = false,
  large = false,
  ...props
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
  large?: boolean;
  hrefLang?: string;
}) {
  return (
    <a
      href={href}
      className={`${buttonClasses} ${primary ? 'border-transparent! bg-gx-accent! text-gx-on-accent! shadow-[inset_0_-2px_#0004] hover:bg-gx-accent-hover!' : ''} ${large ? 'min-h-12! px-6! text-base!' : ''} ${primary && large ? 'gx-pixel-button' : ''}`}
      {...props}
    >
      {children}
    </a>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <>
      <p className="gx-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {lead && <p className="gx-lead">{lead}</p>}
    </>
  );
}

export function PixelImage({
  file,
  alt,
  width,
  height,
  pending,
  priority = false,
  className = '',
}: {
  file: string;
  alt: string;
  width: number;
  height: number;
  pending: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`gx-image ${className}`} style={{ aspectRatio: `${width} / ${height}` }}>
      {failed ? (
        <div className="gx-image-pending" role="img" aria-label={`${pending}: ${alt}`}>
          <span>{pending}</span>
        </div>
      ) : (
        <img
          ref={(element) => {
            // An eager image can fail before SSR hydration attaches onError.
            if (element?.complete && element.naturalWidth === 0) setFailed(true);
          }}
          src={`/images/landing/${file}`}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export function Icon({ name }: { name: string }) {
  return (
    <span className="gx-icon-plate">
      <img src={`/images/landing/icons/${name}.png`} width="16" height="16" alt="" />
    </span>
  );
}

// Lightweight highlighting of the fixed Luau/Rhai snippets. No HTML injection
// or client-side highlighter dependency; React escapes every token as text.
const tokens =
  /("[^"\n]*"|'[^'\n]*'|--[^\n]*|\b(?:local|function|end|if|then)\b|\b(?:true|false)\b|\b\d+\b|\b[A-Za-z_]\w*(?=\())/g;
function tokenClass(token: string) {
  if (/^--/.test(token)) return 'comment';
  if (/^["']/.test(token)) return 'string';
  if (/^(local|function|end|if|then)$/.test(token)) return 'keyword';
  if (/^\d+$/.test(token)) return 'number';
  if (/^(true|false)$/.test(token)) return 'constant';
  if (/^\w+$/.test(token)) return 'function';
  return undefined;
}

export function CodeBlock({
  code,
  label,
  numbered = false,
  terminal = false,
}: {
  code: string;
  label: string;
  numbered?: boolean;
  terminal?: boolean;
}) {
  return (
    <pre
      className={`gx-code${numbered ? ' gx-code-numbered' : ''}${terminal ? ' gx-terminal' : ''}`}
      aria-label={label}
    >
      <code>
        {code.split('\n').map((line, lineNumber) => (
          <span className="gx-code-line" key={lineNumber}>
            {line.split(tokens).map((part, tokenIndex) => {
              const kind = tokenClass(part);
              return kind ? (
                <span className={`gx-syn-${kind}`} key={tokenIndex}>
                  {part}
                </span>
              ) : (
                part
              );
            })}
            {!line && '\u200b'}
          </span>
        ))}
      </code>
    </pre>
  );
}

export function Panel({
  icon,
  title,
  detail,
  children,
}: {
  icon: string;
  title: string;
  detail?: string;
  children: ReactNode;
}) {
  return (
    <div className="gx-panel">
      <header>
        <Icon name={icon} />
        <h3>{title}</h3>
        {detail && <span>{detail}</span>}
      </header>
      {children}
    </div>
  );
}
