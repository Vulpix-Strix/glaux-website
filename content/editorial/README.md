# Local editorial content

News and Blog share one catalog, MDX compiler, component registry and renderer.
The imported console manual is a separate collection and is never edited here.

## Write a devlog

1. Start Vite with `pnpm dev` and open `/en/blog/devlog-template` or
   `/es/blog/devlog-template`. These routes exist only in development.
2. Copy the corresponding `.mdx` file, give it a unique kebab-case filename and
   change `id`, title and description. Keep `status: draft` while writing.
3. Replace the editing instructions with your own account. Remove the component
   demonstrations, their test values and the development callout. No sample
   text is published automatically.
4. Add a real `date: YYYY-MM-DD`. Replace or remove every `asset:drafts/...`
   reference before changing `status` to `published`.
5. Run the checks below and inspect the page in both themes and on a narrow
   screen. Commit or publish using your usual workflow.

Files live at `{en,es}/{news,blog}/{slug}.mdx`. Translations share the same `id`
and section, but can have different filenames. Missing translations are not
replaced with content in the other language.

Required metadata: `id`, `title`, `description`, `status` and a nonempty
`categories` list. Published articles also require `date`. Optional fields:
`author`, `featured`, `number`, `notice`, `cover`, `series`, `presentation` and
`event`. The TypeScript model in `src/lib/editorial/model.ts` documents their
shapes. Dates are calendar dates; event times need an explicit UTC offset and
an IANA `timeZone`.

Categories: `announcements`, `development`, `community`, `showcases`, `devlog`,
`technical`, `design`, `lessons`. An article may have several categories.
Optional `presentation` values are `story` (default), `brief`, `showcase`,
`event` and `video`. News groups brief and showcase entries into additional
sections. Event cards require `event` metadata. Featured articles and recent
Blog articles share the first archive page's ten-entry budget.

Series use `{ id, title, part }`. Part numbers must be positive and unique
within a language and section. Only available articles are linked; no future
parts are fabricated.

## Assets and publication boundaries

Place production resources in `assets/published/` and development-only resources
in `assets/drafts/`. Reference them with literal strings, for example:

```mdx
<ArticleFigure
  src="asset:published/shell.png"
  alt="Describe what this image shows"
  width={320}
  height={240}
/>
```

Do not place draft media in `public/`: that directory is always public.
Only resources referenced by selected articles are emitted by Vite. The
production catalog excludes drafts before MDX compilation; it rejects
published references to draft assets. Development serves only registered assets
and supports byte ranges for native video seeking. There is no draft resource
endpoint in the production Worker.

MDX uses the registered components below, so imports and exports in articles
are intentionally rejected. This prevents imports from bypassing the asset
boundary. Relative media paths are not resolved: use `asset:published/...` for
editorial media or existing public resources when they are already public.

The editorial build test checks that drafts and their exclusive resources are
not compiled or emitted. `pnpm test:worker` requests draft routes and resource
URLs from the built Worker and requires 404 responses. `noindex`
is only an additional development hint, not the publication boundary.

## MDX components

The EN/ES development templates contain working examples of every component.
Components receive their labels from the article's locale; content props such
as captions, image descriptions and transcripts are authored in that language.

| Component                  | Props and behavior                                                                                                                                                |
|----------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `ArticleFigure`            | `src`, `alt`, `width`, `height`, optional `caption`                                                                                                               |
| `ArticleGallery`           | `images` with figure props, optional `title`; Base UI modal, arrows, close and focus restoration                                                                  |
| `ImageComparison`          | `before`, `after` images, optional `label` and `initial` percentage; native range keyboard controls                                                               |
| `ArticleVideo`             | `title`, `sources: [{src,type}]`, optional `poster`, `tracks: [{src,srcLang,label,default}]`, `transcript`, `chapters: [{time,title}]`; chapter times are seconds |
| `AnimatedClip`             | `title`, `sources`, `poster`; starts paused, explicit playback, pauses on reduced-motion preference changes                                                       |
| `EventCard`                | `title`, `start`, `end`, `timeZone`, `location`, optional `description`, `url`; local ICS download                                                                |
| `Metric`                   | `label`, `value`, optional `unit`, `context`; use verified values in published content                                                                            |
| `Milestone`                | `label`, `value`, positive `goal`, optional `context`; requires `0 <= value <= goal`                                                                              |
| `EditorialNotice`          | Article-authored children; absent unless explicitly used, no default sample warning                                                                               |
| `ResourceCard`, `GameCard` | `href`, `title`, optional `image`, explanatory children; no playable content or statistics are invented                                                           |
| `InlineTOC`                | Fumadocs index; `items={toc}` uses compiler-generated headings                                                                                                    |
| `Tabs`, `Tab`              | Fumadocs tabs; `items={['First', 'Second']}` and matching `Tab` children                                                                                          |
| `TypeTable`                | Fumadocs type documentation table; `type={{name: {type: 'string', description: '...', required: true}}}`                                                          |
| `Callout`                  | Fumadocs callout with optional `title` and children                                                                                                               |

Fenced code blocks reuse Fumadocs highlighting and copy controls. Markdown
supports GFM tables and lists. Reading estimates use `reading-time` at build
time (200 words/minute), with localized labels; they are independent of the
scroll-based reading progress indicator. Videos use native controls, local
WebVTT captions and an optional transcript. Use MP4/WebM rather than GIF when
readers need to pause an animation.

## Verification

```sh
pnpm build
pnpm test
pnpm types:check
pnpm lint
pnpm credits:check
pnpm test:worker
```

No CMS, remote media player, GitHub statistics fetch or external publishing
service is used. Base UI is the same version used by Fumadocs. Tailwind tokens
are shared with the existing site; complex scoped CSS remains where it is clearer.
