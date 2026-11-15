# Credits data

`public/credits/` holds the data the Credits page reads. It is generated and served as static
files, so the page never builds it. The npm files are committed; the Glaux files are written by
every build. Everything about npm lives here; nothing about it
is written in Glaux.

| File | Content |
|---|---|
| `editorial.json` | Sections of `rom/credits.ron` and the bundled art, with its author |
| `glaux.json` | Rust crates (`libraries`) and vendored native code (`native`) of Glaux, and its commit |
| `glaux-texts.json` | The license texts the two lists above point at |
| `npm.json` | npm packages of this website, runtime and build tools |
| `npm-texts.json` | The license texts `npm.json` points at |

Indexes hold no license text. An entry lists `text_ids`, indexes into the `texts` of the matching
`*-texts.json`, so a page loads the texts only when it shows one. Both inventories use the shape
of Glaux's `apps/glaux/licenses/*.json`: each distinct text is stored once. The npm entries add
`scope` (`runtime` or `dev`), `direct` and `author`.

## Updating

```bash
pnpm credits:sync    # writes npm.json and npm-texts.json
pnpm credits:check   # fails when they differ from what sync would write (runs in CI)
pnpm credits:glaux   # writes the Glaux files; pnpm dev and pnpm build run it
```

Run `sync` after `pnpm install` changes a dependency, and commit the result. It never runs during
a build.

`credits:glaux` reads Glaux at the commit of the documentation version the site shows, from the
catalog `pnpm docs:sync` writes, and only `rom/credits.ron` and `apps/glaux/licenses/` are
fetched. They are never edited, and the files it writes are not committed.

## Where npm packages come from

- **Which packages, runtime or build tool, direct or not:** `pnpm sbom` (CycloneDX). A package
  is `dev` when only `devDependencies` reach it.
- **Where each is installed:** `pnpm licenses list --json`.
- **Texts:** the files a package ships (`LICENSE*`, `COPYING*`, `UNLICENSE*`, `NOTICE*`). A
  README is never taken for one. A package that ships several, such as `LICENSE-MIT` and
  `LICENSE-APACHE`, contributes all of them.

An entry with no text is an error. The identifier of its license (`MIT`) is not a text, and
neither is a generic SPDX template. The fix is an override.

## Overrides

`overrides.json` and `texts/` hold the text of packages that ship none. Each text is copied
unchanged from the official repository of the package, at the commit of the tagged release, and
`source` links that exact file. `retrieved` and `note` are for people and are not published.

- Keyed by `name@version`, so updating a package makes `sync` fail until its text is checked
  again, because a new release can change its license.
- An override for a package that now ships its own text, or that is no longer installed, is an
  error.
- When the repository has no commit for the release, say so in `note`, as for
  `react-remove-scroll-bar`.

To add one: find the repository (`npm view <package> repository`), the commit of the tag or the
`gitHead`, copy the file as it is there into `texts/`, and add the entry with its `source`.

## Native packages

Native tools such as esbuild ship one npm package per platform (`@esbuild/darwin-arm64`,
`@esbuild/linux-x64`, ...) and pnpm installs only the one that fits the machine. Listing what is
installed would make the data differ between a Mac and CI, so `npm.json` describes one
reference platform, **linux x64 glibc**, which is what CI and Cloudflare Workers Builds install.
The lockfile covers every platform, so it decides:

1. A package restricted by `os`, `cpu` or `libc` is listed only if pnpm installs it on the
   reference platform. The rest are named in `omitted` (`fsevents`, which only exists on macOS,
   and `@img/sharp-webcontainers-<platform>`, which is WebAssembly). They are never dropped
   silently, and the list is the same whether they are installed or not.
2. All the variants of one package are one entry, named `@esbuild/<platform>`, described by
   whichever variant is installed.
3. That entry is folded into the package that depends on it, and shown there as `binaries`, when
   both declare the same license: the license of esbuild covers its binaries. It stays an entry
   of its own when the license differs, as for libvips inside sharp (LGPL inside Apache-2.0).

Packages that are not restricted to a platform are never filtered by this.

## Limits

- `scope: "runtime"` means a runtime dependency of the project, not that the package ends up in
  the Worker bundle. Several build tools are reachable from `dependencies`. Telling what is
  bundled needs the bundler's output and is not done.
- `spdx` on an npm text is what the package declares, not what was identified in the text. It is
  set only for a package with a single license file and a single license.
- `@img/sharp-libvips-<platform>` is a bundle of libraries under many licenses. Its official
  notice is kept, but the package does not carry the full text of each license, and neither does
  this data.
- A license checker package was tried and not kept. `@lizenz/checker` only returns where a license
  file is, which the rule above already does, and installing it would add about 130 build tool
  packages to this inventory.
