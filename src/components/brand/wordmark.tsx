import type { ComponentProps } from 'react';

/** The pixel wordmark: "glaux" followed by the cyan cursor block. Styled in `glaux-tokens.css`. */
export function Wordmark(props: ComponentProps<'span'>) {
  return (
    <span {...props} className={props.className ? `gx-wordmark ${props.className}` : 'gx-wordmark'}>
      glaux<span className="gx-wordmark-cursor" aria-hidden="true" />
    </span>
  );
}
