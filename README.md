# Glaux Website

*The home of a console from a 1993 that never existed.*

This repository contains the official website for [Glaux G1](https://github.com/Vulpix-Strix/glaux), an open-source fantasy console developed by Vulpix Strix.

Built with TanStack Start, the website brings together Glaux's documentation, development updates, tutorials, and everything surrounding the console.

The documentation is synchronized directly from the main Glaux repository, keeping the website and the console's built-in documentation consistent.

## Tech stack

- **TanStack Start** for routing, server-side rendering, and application infrastructure.
- **React and TypeScript** for the frontend.
- **Tailwind CSS** for styling.
- **Fumadocs** for documentation.
- **Cloudflare Workers** for deployment.
- **pnpm** for package management.

## Getting started

You'll need Node.js and pnpm installed.

Clone the repository and install dependencies:

```bash
git clone https://github.com/Vulpix-Strix/glaux-website.git
cd glaux-website
pnpm install
```

Synchronize the documentation:

```bash
pnpm docs:sync --locked
```

Start the development server:

```bash
pnpm dev
```

The documentation is fetched anonymously from a pinned revision of the public Glaux repository. No token, authentication, or separate clone is required.

## Documentation

Glaux maintains its documentation alongside the console's source code.

Rather than maintaining a separate copy, this website imports the original Markdown files and adapts them for Fumadocs.

The integration preserves:

- The navigation order defined by Glaux.
- Heading anchors compatible with the built-in documentation viewer.
- Internal documentation links.
- Syntax highlighting for Luau and Rhai.
- Language availability and translation fallbacks.

### Updating the documentation

The source revision is recorded in `glaux-docs.lock`.

To synchronize the currently pinned revision:

```bash
pnpm docs:sync --locked
```

To pin a different revision:

```bash
pnpm docs:pin <ref>
```

Run `pnpm docs:pin` without a ref to pin the latest commit on Glaux's default branch, then run `pnpm docs:sync --locked`.

Run `pnpm docs:check` to fetch the full pinned source anonymously and run Glaux's own documentation checks through `mise`. For local development, `GLAUX_DIR=/path/to/glaux pnpm docs:check` validates an explicit checkout instead.

The generated documentation is not maintained manually in this repository. Changes to the original documentation should be made in [Vulpix-Strix/glaux](https://github.com/Vulpix-Strix/glaux).

## Development

Before submitting changes, run the available checks:

```bash
pnpm test
pnpm types:check
pnpm lint
pnpm build
```

Documentation-related changes should preserve compatibility with Glaux's own documentation renderer.

Please avoid modifying generated documentation files directly.

## Contributing

Contributions, bug reports, and suggestions are welcome.

If you find an issue with the website itself, open an issue in this repository.

For problems with the console, its scripting APIs, or the original documentation, use the [Glaux repository](https://github.com/Vulpix-Strix/glaux).

## License

The website's source code is licensed under the [MIT License](LICENSE).

Documentation imported from Glaux retains its original licensing and attribution. Glaux and Vulpix Strix branding, logos, and other separately identified visual assets are not automatically covered by the website's source-code license.


## Landing page

The landing is available at `/en` and `/es`; `/` redirects to English.
Documentation remains at `/en/docs`. Spanish landing links explicitly identify
English documentation. Landing styles are scoped separately from Fumadocs.

Hanken Grotesk and JetBrains Mono are self-hosted using Fontsource packages;
Pixel Code is reused from the Glaux intro project. Asset attribution and font
licenses are included in `public/ASSET-CREDITS.txt` and `public/fonts/`.

Four original PNGs are still required in `public/images/landing/`:
`signal-lost-gameplay.png` (320×240), `glaux-shell.png` (320×240),
`signal-lost-title.png` (320×240), and `master-palette.png` (16×16).
See `public/images/landing/README.md` for their exact content. The reference
HTML is visual guidance only; none of its embedded assets or scripts are used.
Until supplied, failed images show a localized message in reserved space.

News and Blog show their actual empty states until local articles are published.
Binary downloads remain unavailable; no release URLs are fabricated. The source repository and existing docs remain usable.

## Credits

The data of the Credits page (the people, the art, and the licenses of Glaux's crates and of this website's npm packages) is generated and committed in `public/credits/`.

```bash
pnpm credits:sync
pnpm credits:check
```

Run `pnpm credits:sync` after changing a dependency or moving the Glaux revision, and commit the result. CI runs `pnpm credits:check`. The npm packages are described in this repository only; Glaux's own credit files are read at the revision in `glaux-docs.lock` and never edited. See `credits/README.md` for how the data is built and how to add a missing license text.


## News and Blog

Localized listings live at `/en/news`, `/es/news`, `/en/blog` and `/es/blog`.
Articles are local MDX files with shared metadata, loading and rendering. Each
section has its own localized RSS feed at `/{lang}/{section}/rss.xml`.

Start with `/en/blog/devlog-template` or `/es/blog/devlog-template` in development.
The templates demonstrate all editorial components, including galleries,
comparisons, media, events and metrics. Draft articles and their exclusive
resources are excluded before production compilation and checked again in the
built output and Worker smoke tests.

See [the editorial authoring guide](content/editorial/README.md) for metadata,
publication, translations, assets and component examples. Never store draft
resources in `public/`.
