---
scope: project
severity: contract
repeat: rule
triggers: ["임베드", "embed", "노션", "Notion", "iframe", "\\?embed=1", "임베드 (주소|URL|링크)", "useEmbedMode"]
slots: []
sources: [src/hooks/useEmbedMode.js#L4, src/main.jsx#L10, how_to.md#L707]
links: [css-module-classes-must-exist, vite-base-and-hash-router]
---

# The embed flag is `?embed=1` before the `#`, and each widget styles its own embed mode

Rule. Write embed URLs as
`https://<user>.github.io/ml-interactive-lab/?embed=1#/widgets/<subject>/<id>`,
with `?embed=1` before the `#`. Never put the flag after the hash route, and
do not change `useEmbedMode` to read the hash or `useSearchParams` without
updating every published embed link. A new widget must call
`useEmbedMode()` and add its own embed class from its CSS module to `<main>`;
the hook alone changes nothing visible but `data-embed` on `<html>`. To force
Notion to refetch, add a harmless parameter before the hash (`?embed=1&v=2#...`).

Why. `useEmbedMode` reads `window.location.search`
(`src/hooks/useEmbedMode.js:4-5`), and with `HashRouter`
(`src/main.jsx:10`) everything after `#` is the router's path, not the
query string. `how_to.md:707` states the same constraint, and
`how_to.md:927-945` gives the cache-busting trick. Global embed CSS only
whitens the background (`src/styles/global.css:164-169`); the borderless,
compact layout is in each widget's `--embed` class.

What goes wrong. `/#/widgets/...?embed=1` renders the full page inside the
Notion iframe, with padding, borders, the home link and the description, and
nothing reports an error.
