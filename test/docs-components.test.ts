import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { getMDXComponents } from '@/components/docs/mdx';
import { ScriptLanguageFold, ScriptLanguageToggle } from '@/components/docs/script-language';

test('GFM alerts keep their kind and take the title from the message catalog', () => {
  const { Callout } = getMDXComponents();
  const html = renderToStaticMarkup(createElement(Callout, { title: 'Warning', type: 'warning' }, 'Careful.'));
  expect(html).toContain('data-kind="warning"');
  expect(html).toContain('>Warning<');
});

test('Rhai is not offered, so the toggle is hidden and Rhai samples stay folded', () => {
  expect(renderToStaticMarkup(createElement(ScriptLanguageToggle))).toBe('');
  const folded = renderToStaticMarkup(createElement(ScriptLanguageFold, { language: 'rhai', children: 'let x = 1;' }));
  expect(folded).toMatch(/<details[^>]*><summary>Show Rhai · experimental sample<\/summary>let x = 1;<\/details>/);
  expect(renderToStaticMarkup(createElement(ScriptLanguageFold, { language: 'luau', children: 'local x = 1' }))).toBe('local x = 1');
});
