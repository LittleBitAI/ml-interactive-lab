---
scope: project
severity: contract
repeat: rule
triggers: ["빈 화면", "흰 화면", "blank", "base", "vite\\.config", "GitHub Pages", "깃허브 페이지", "배포.*(안|빈|깨)", "BrowserRouter", "HashRouter", "라우터", "저장소 이름", "repo(sitory)? 이름", "새로고침.*404"]
slots: []
sources: [vite.config.js#L6, src/main.jsx#L10, how_to.md#L889]
links: [gate-lint-and-build, embed-flag-before-hash]
---

# `base` must equal `/ml-interactive-lab/` and routing must stay hash-based for GitHub Pages

Rule. Keep `base: '/ml-interactive-lab/'` in `vite.config.js` equal to the
GitHub repository name; if the repository is renamed, change `base` in the
same commit. Keep `HashRouter` in `src/main.jsx`: do not switch to
`BrowserRouter` or path-based URLs, because GitHub Pages cannot rewrite unknown
paths to `index.html` and every published widget and Notion embed link uses
the `#/widgets/...` form. Reference runtime assets through imports from
`src/` or `import.meta.env.BASE_URL`, never a root-absolute `/file` path.
After touching any of these, run `npm run build` and `npm run preview` and
open a widget URL, not just the dev server.

Why. The site is served from `https://<user>.github.io/ml-interactive-lab/`
(`how_to.md:669-695`), so built asset URLs need the prefix
(`vite.config.js:6`). `how_to.md:889-904` documents the symptom when it is
wrong. Routing is `HashRouter` (`src/main.jsx:10`), so a reload of
`/#/widgets/...` always requests `index.html`.

What goes wrong. A wrong `base` gives a blank page on GitHub Pages while
`npm run dev` looks fine, because scripts and CSS 404. `BrowserRouter` works
locally but every direct link or reload of a widget URL on Pages returns 404,
and every embed already pasted into Notion breaks.
