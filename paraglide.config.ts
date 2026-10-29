import type { CompilerOptions } from '@inlang/paraglide-js';

// Shared by the Vite plugin and `scripts/compile-i18n.ts`, so type checks see the same generated
// runtime as the build and the tests. The locale lives in the `/en` and `/es` path segment, which
// TanStack Router owns. Paraglide only reads it: no URL rewriting, cookies or browser detection.
export const paraglideOptions = {
  project: './project.inlang',
  outdir: './src/paraglide',
  strategy: ['url', 'baseLocale'],
  urlPatterns: [
    {
      pattern: '/:path(.*)?',
      localized: [
        ['en', '/en/:path(.*)?'],
        ['es', '/es/:path(.*)?'],
      ],
    },
  ],
} satisfies CompilerOptions;
