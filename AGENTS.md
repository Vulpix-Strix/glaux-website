## General

- Keep changes focused on the requested task. Avoid unrelated refactors, speculative abstractions, and unnecessary dependencies.
- Inspect existing code and follow project conventions before introducing new patterns.
- Prefer simple, readable, maintainable solutions over clever or overly generic implementations.
- Do not implement speculative features, fake content, or unnecessary placeholders.

## Architecture

- Keep routing, business logic, content processing, and presentation clearly separated.
- Keep React components focused and reasonably small. Extract complex logic instead of accumulating it inside JSX.
- Reuse existing components and infrastructure when appropriate. Avoid duplicated behavior and premature abstractions.
- Prefer explicit types, descriptive names, early returns, and straightforward control flow.
- Avoid deeply nested conditionals, unnecessary hooks, excessive state, and large configuration objects.
- Preserve server/client boundaries and compatibility with TanStack Start and Cloudflare Workers.

## Styling

- Prefer Tailwind CSS v4 utilities over writing new CSS rules.
- Centralize reusable design tokens and use Tailwind's theme facilities where appropriate.
- Preserve Glaux's existing theme scoping and Fumadocs compatibility.
- Avoid repeated arbitrary values, excessive conditional class expressions, and unreadable class lists.
- Keep custom CSS for cases where utilities would reduce clarity or fail to express the intended behavior.
- Reuse shared UI components instead of duplicating complex styling.

## Content and localization

- Keep English and Spanish routing and localization consistent.
- Never invent release information, documentation, news, or other factual content.
- Keep editorial content separate from presentation logic.
- Preserve documentation synchronization and avoid manually editing generated content.
- Respect existing attribution, licenses, and credits generation workflows.

## Comments and documentation

- Write comments and documentation in clear, natural English.
- Explain non-obvious behavior, invariants, constraints, and workarounds rather than narrating code.
- Avoid redundant comments, mechanical `Concept: description` writing, and em dashes.
- Keep documentation concise and update it when behavior or workflows change.

## Testing and validation

- Test meaningful behavior, edge cases, and regressions without duplicating implementation details.
- Keep tests deterministic. Never weaken assertions just to make them pass.
- Use pnpm and the existing project scripts.
- Run relevant checks, including `pnpm test`, `pnpm types:check`, `pnpm lint`, and `pnpm build` when appropriate.
- Run `pnpm docs:check` or `pnpm credits:check` when changes affect their respective workflows.
- Report failures clearly and distinguish existing problems from introduced regressions.
- Do not commit or push unless explicitly requested.