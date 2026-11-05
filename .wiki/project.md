---
scope: project
severity: preference
triggers: []
slots: []
sources: []
links: []
---

# ML Interactive Lab — a static React site of interactive math/ML learning widgets

## What it is for

A catalogue of small, self-contained interactive widgets that teach
probability, statistics, linear algebra and ML concepts by letting the reader
move sliders and watch formulas and charts change. Each widget has its own URL
so it can be embedded on its own (typically into Notion) as well as browsed
from the home page. The UI text is Korean. The site is fully static: no
backend, no API, no persistence. Human docs are `README.md` (points to
`README-KO.md`), `README-KO.md` (install/run/deploy) and `how_to.md` (setup,
adding a widget, formulas, deploy, Notion embedding, troubleshooting).

## Stack

Vite 8 + React 19 (JSX, no TypeScript), `react-router` 7 with a hash router,
`recharts` for charts, `katex` for formulas, ESLint 10 flat config. See
`package.json`, `vite.config.js`, `eslint.config.js`.

## Top-level layout

| Path | Role |
| --- | --- |
| `index.html` | Vite entry HTML; mounts `#root` and loads `src/main.jsx` |
| `vite.config.js` | React plugin; `base: '/ml-interactive-lab/'` for GitHub Pages |
| `eslint.config.js` | Lint rules (recommended, react-hooks, react-refresh), ignores `dist` |
| `public/` | Static assets copied as is (`favicon.svg`, `icons.svg`) |
| `src/` | All application code (below) |
| `.github/workflows/deploy.yml` | CI: lint, build, deploy `dist/` to GitHub Pages |
| `.claude/settings.json` | Agent permission denies (not part of the app) |
| `.wiki/` | This wiki and its adapter (`.wiki/adapter.toml`) |

### Inside `src/`

| Path | Role |
| --- | --- |
| `src/main.jsx` | Creates the React root inside `StrictMode` + `HashRouter`; imports KaTeX CSS and `src/styles/global.css` |
| `src/App.jsx` | One `Suspense` around `Routes`: `/` → home, one route per registry entry, `*` → not found |
| `src/data/widgetRegistry.js` | The single list of widgets: id, title, category, description, path, status, lazily imported component. In dev it throws on missing required fields or duplicate ids/paths |
| `src/pages/HomePage.jsx` | Catalogue grid of registry entries with `status === 'published'` |
| `src/pages/NotFoundPage.jsx` | Fallback route |
| `src/hooks/useEmbedMode.js` | Reads `?embed=1` from the query string, sets `data-embed` on `<html>`; widgets use it to switch to a borderless layout |
| `src/components/common/` | Shared pieces: `MathFormula.jsx` (KaTeX render with error fallback), `ProbabilitySlider.jsx`, `ProbabilityStackedBar.jsx` (each with a CSS module) |
| `src/widgets/<subject>/` | One folder per subject (`probability`, `statistics`, `linear-algebra`) |
| `src/styles/global.css` | Global styles, including the catalogue and embed rules |

Unused Vite template leftovers that nothing imports: `src/App.css`,
`src/index.css`, `src/assets/hero.png`, `src/assets/react.svg`,
`src/assets/vite.svg`.

## Widget anatomy

Each widget is a page component plus a CSS module, and usually a pure model
module:

- `XxxPage.jsx` — UI state (`useState`/`useMemo`), sliders, `recharts`
  charts, `MathFormula`, and a call to `useEmbedMode`.
- `XxxPage.module.css` — scoped styles, including an embed variant.
- `xxxModel.js` — pure functions and constants (calculations, curve
  generation, formatting, interpretation text) with no React imports.

Current widgets (all `published`):

| Registry id | Route | Files |
| --- | --- | --- |
| `bayes-theorem` | `/widgets/probability/bayes-theorem` | `src/widgets/probability/BayesTheoremPage.jsx` (no separate model; uses the common slider and stacked bar) |
| `expected-value` | `/widgets/probability/expected-value` | `src/widgets/probability/ExpectedValuePage.jsx`, `expectedValueModel.js` |
| `dot-product-projection` | `/widgets/linear-algebra/dot-product-projection` | `src/widgets/linear-algebra/DotProductProjectionPage.jsx`, `dotProductModel.js` |
| `likelihood-mle` | `/widgets/statistics/likelihood-mle` | `src/widgets/statistics/LikelihoodMlePage.jsx`, `likelihoodModel.js` |

## How the parts talk

`main.jsx` → `App.jsx` → `widgetRegistry.js`. The registry is the only place
a widget is wired in: `App.jsx` maps it to routes and `HomePage.jsx` maps it to
cards, and each component is code-split through `React.lazy`. Widgets import
only from `src/components/common/`, `src/hooks/` and their own model file;
they do not talk to each other. Routing is hash-based, so a widget URL looks
like `<site>/ml-interactive-lab/#/widgets/<subject>/<id>`, and the embed form
adds `?embed=1` before the hash.

Adding a widget therefore means: create the folder files, then add one entry
to `src/data/widgetRegistry.js`. `how_to.md` section "4. App.jsx에 위젯 URL
등록" still describes adding an import and a `Route` to `src/App.jsx` by
hand; that predates the registry-driven routes and is no longer needed.

## Build, run, test

- Install: `npm ci` (or `npm install`).
- Dev server: `npm run dev` (Vite; served under `/ml-interactive-lab/`).
- Lint: `npm run lint`.
- Build: `npm run build` → `dist/`; preview with `npm run preview`.
- Tests: none. There is no test runner or test script; the only automated
  checks are ESLint and the dev-time registry validation.
- Deploy: every push to `main` (or a manual dispatch) runs
  `.github/workflows/deploy.yml` on Node 24: `npm ci`, `npm run lint`,
  `npm run build`, upload `dist/`, deploy to GitHub Pages.
- `.wiki/adapter.toml` declares `gate_cmd = "npm run lint && npm run build"`
  (what CI runs before deploying) and
  `live_cmd = "npm run build && npm run preview -- --port 4173 --strictPort"`,
  which serves the built site at `http://localhost:4173/ml-interactive-lab/`
  the way GitHub Pages does. `server_stop` stops only the process listening
  on port 4173 whose command line is `vite ... preview --port 4173`.
