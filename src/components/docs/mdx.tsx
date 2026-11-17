import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { m } from '@/paraglide/messages';
import { ScriptLanguageFold, type PreProps, type ScriptLanguage } from './script-language';

const isScriptLanguage = (value: unknown): value is ScriptLanguage => value === 'luau' || value === 'rhai';

/** Fumadocs' code block; a Luau or Rhai sample also follows the reader's script language. */
function Pre(props: PreProps) {
  const block = defaultMdxComponents.pre(props);
  const language = props['data-language'];
  return isScriptLanguage(language) ? <ScriptLanguageFold language={language}>{block}</ScriptLanguageFold> : block;
}

const alertTitles: Record<string, () => string> = {
  note: m.docs_alert_note,
  tip: m.docs_alert_tip,
  important: m.docs_alert_important,
  warning: m.docs_alert_warning,
  caution: m.docs_alert_caution,
};

/**
 * Fumadocs' callout, tagged with its GFM alert name (Note, Tip, Important…) so each kind can be styled.
 * The English title the alert plugin writes is replaced with the one of the page language.
 */
function Callout(props: Parameters<typeof defaultMdxComponents.Callout>[0]) {
  const kind = typeof props.title === 'string' ? props.title.toLowerCase() : undefined;
  const title = kind && alertTitles[kind] ? alertTitles[kind]() : props.title;
  return <defaultMdxComponents.Callout data-kind={kind} {...props} title={title} />;
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    pre: Pre,
    Callout,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
