# Rhai grammar

`rhai.tmLanguage.json` is the TextMate grammar of [rhaiscript/vscode-rhai](https://github.com/rhaiscript/vscode-rhai),
copied unchanged from `syntax/rhai.tmLanguage.json` at commit `3b4cb6d4` (v0.7.1). It is licensed under the
[Mozilla Public License 2.0](https://github.com/rhaiscript/vscode-rhai/blob/main/LICENSE).

Shiki bundles Luau but not Rhai, and this one is the grammar the Rhai project itself maintains. The site loads it in
`../mdx-options.ts` so the Rhai blocks of the Glaux manual are highlighted as Rhai. Update it by copying the file again
from a newer release and changing the commit above; do not edit the file.
