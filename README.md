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

The documentation is fetched from a pinned revision of the public Glaux repository, so you don't need to clone Glaux separately.

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
