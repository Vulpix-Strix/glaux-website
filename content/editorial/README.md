# Writing articles for Glaux

News and Blog articles are plain text files written in Markdown. This guide covers everything you need to write one, add images and publish it.

## Quick start

1. Create a draft:

   ```sh
   pnpm new:post --title "My first article"
   ```

   This creates a Spanish blog draft. Add `--lang en` for English, `--lang both` for both languages, or `--section news` for a news item. If you leave out `--title`, you will be asked for it.

2. Run `pnpm dev` and open the draft, for example `/es/blog/my-first-article`. Drafts show up only on your computer.
3. Fill in the `description`, then write below the second `---` line, in normal Markdown.
4. When it is ready, change `status` to `published` and add a `date`. That is all. See [Publishing](#publishing).

Articles live in `content/editorial/{es,en}/{blog,news}/`. The file name becomes the web address.

## The top of the file

Every article starts with a block of settings between two `---` lines:

```yaml
---
id: my-first-article
title: "My first article"
description: "One or two sentences. Search results and social posts show this."
status: draft
date: 2026-11-02
categories: [development, devlog]
cover:
  src: asset:my-first-article/cover.png
  alt: What the picture shows
ogImage:
  src: asset:my-first-article/social.png
series:
  id: glaux-devlog
  title: Building Glaux
  part: 1
---
```

| Setting       | What it does                                                                                                                                         |
|---------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| `id`          | Name that ties the article to its translations and to its image folder. Both language versions use the same `id`. Do not change it after publishing. |
| `title`       | The headline.                                                                                                                                        |
| `description` | A short summary. It can stay empty while the article is a draft, but not once published.                                                             |
| `status`      | `draft` is private. `published` is public.                                                                                                           |
| `date`        | Publication day as `YYYY-MM-DD`. Required once published.                                                                                            |
| `categories`  | At least one of `announcements`, `development`, `community`, `showcases`, `devlog`, `technical`, `design`, `lessons`.                                |
| `cover`       | Optional picture shown at the top of the article and on article cards. Needs `src` and `alt`.                                                        |
| `ogImage`     | Optional picture for link previews. See [Cover and link preview](#cover-and-link-preview). Needs `src`, and `alt` is recommended.                    |
| `series`      | Optional. Groups articles into a numbered series. Use the same `id` and `title` in every part and give each part its own `part` number.              |
| `author`      | Optional name shown on the article.                                                                                                                  |
| `featured`    | Optional. `true` highlights the article on the Blog page.                                                                                            |
| `number`      | Optional. The devlog number, for Blog articles in a numbered devlog.                                                                                 |

Less common settings are `presentation` (`story`, `brief`, `showcase`, `event` or `video`) and `event` (start, end, time zone and location, needed for `presentation: event`).

## Images

Put images in a folder named after the article's `id`:

```
content/editorial/assets/my-first-article/shell.png
```

Then use them anywhere in the article. A normal Markdown image works:

```md
![Glaux shell](asset:my-first-article/shell.png)
```

Use `ArticleFigure` when you want a caption:

```mdx
<ArticleFigure
  src="asset:my-first-article/shell.png"
  alt="Glaux shell"
  caption="The shell on first launch"
/>
```

Always write a short `alt` text that describes the image. PNG, JPEG and WebP sizes are detected automatically. For other formats, or to force a size, add `width` and `height`.

The reference `asset:<id>/<file>` never changes, so you do not edit it when you publish.

## Cover and link preview

The cover and the link preview are separate on purpose.

| `cover` | `ogImage` | Top of the article | Link preview (social networks, chat apps) |
|---------|-----------|--------------------|-------------------------------------------|
| no      | no        | no picture         | generated card                            |
| yes     | no        | the cover          | generated card                            |
| yes     | yes       | the cover          | your `ogImage`                            |
| no      | yes       | no picture         | your `ogImage`                            |

The generated card shows the title, date and category, and uses the cover when there is one. Set `ogImage` only when you want to design the preview yourself. 1200 by 630 pixels works well.

## Publishing

Change two things in the settings block:

```diff
-status: draft
+status: published
+date: 2026-11-02
```

Nothing else moves and no image references change. Before you push, run the checks in [Before you publish](#before-you-publish).

Two things to know:

- Pictures used only by drafts are not part of the public site. A picture that a published article also uses becomes public, even if a draft uses it as well.
- Never put private images in `public/`. Everything in that folder is public.

## Translations

Write the Spanish and English versions as two files with the same `id`. They can have different file names, so each language gets its own web address. If only one language exists, only that language shows the article.

## Components

Besides Markdown, articles can use ready-made components for galleries, before and after sliders, video, events, metrics, tabs and more. The demo article shows every one of them working, with copyable examples. It only exists on your computer, at `/en/blog/component-demo` and `/es/blog/component-demo`.

Articles cannot use `import` or `export`. Only the components in the demo are available.

## Before you publish

```sh
pnpm test
pnpm types:check
pnpm lint
pnpm build
```

Then open the article in light and dark mode and on a narrow screen.
