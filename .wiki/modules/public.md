---
scope: project
severity: preference
triggers: []
slots: []
sources: []
links: []
---

# public/ — static files Vite copies untouched into the build root

## What it is for

This is Vite's public directory. Files here are not processed or hashed. They
are served at the site root in dev and copied to `dist/` on build. It holds
two SVGs: `public/favicon.svg` and `public/icons.svg`.

## Entry points

- `public/favicon.svg` is the tab icon, referenced as `/favicon.svg` from
  `index.html:5`.
- `public/icons.svg` is an SVG sprite of `<symbol>` elements
  (`bluesky-icon`, `discord-icon`, `documentation-icon`, `github-icon`,
  `social-icon`, `x-icon`; the first is at `public/icons.svg:2`).

## Depends on / depended on by

- It depends on nothing.
- `index.html:5` is the only consumer of `favicon.svg`.
- Nothing in `src/` or `index.html` references `icons.svg`. It is a leftover
  from the Vite + React starter template, like the unused files in
  `src/assets/` (see `.wiki/modules/src.md`).

## What trips a newcomer

- The site is served under `base: '/ml-interactive-lab/'`
  (`vite.config.js:6`). `index.html:5` writes `/favicon.svg` without the
  base, and Vite rewrites it at build time to
  `/ml-interactive-lab/favicon.svg`. A public asset referenced from JSX at
  runtime is not rewritten that way: build its URL from
  `import.meta.env.BASE_URL`, or import the file from `src/` so Vite hashes
  it.
- Deleting `icons.svg` is safe as far as the repo goes (no references), but
  `public/` files are addressable by URL. Check that nothing outside the repo
  (a Notion embed, an external page) links to one before removing it.
