import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { ScriptLanguageFold, type PreProps, type ScriptLanguage } from './script-language';

const isScriptLanguage = (value: unknown): value is ScriptLanguage => value === 'luau' || value === 'rhai';

/** Fumadocs' code block; a Luau or Rhai sample also follows the reader's script language. */
function Pre(props: PreProps) {
  const block = defaultMdxComponents.pre(props);
  const language = props['data-language'];
  return isScriptLanguage(language) ? <ScriptLanguageFold language={language}>{block}</ScriptLanguageFold> : block;
}

/** Fumadocs' callout, tagged with its GFM alert name (Note, Tip, Important…) so each kind can be styled. */
function Callout(props: Parameters<typeof defaultMdxComponents.Callout>[0]) {
  const kind = typeof props.title === 'string' ? props.title.toLowerCase() : undefined;
  return <defaultMdxComponents.Callout data-kind={kind} {...props} />;
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
