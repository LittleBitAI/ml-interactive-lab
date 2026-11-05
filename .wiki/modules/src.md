---
scope: project
severity: preference
triggers: []
slots: []
sources: []
links: []
---

# src/ — the React application: router shell, widget registry and widgets

## What it is for

This directory holds all application code for the static widget catalogue: a
hash-routed shell, a home page that lists widgets, and one self-contained
interactive page per widget. UI strings are Korean (for example
`src/App.jsx:10`, `src/pages/HomePage.jsx:13`).

## Entry points

- `src/main.jsx:8` creates the React root on `#root` (from `index.html`),
  wrapped in `StrictMode` and `HashRouter` (`src/main.jsx:9-10`). It also
  loads the KaTeX stylesheet and `src/styles/global.css`
  (`src/main.jsx:4-5`).
- `src/App.jsx:15` is the route table: `/` goes to `HomePage`
  (`src/App.jsx:19`), each registry entry gets one route
  (`src/App.jsx:20-30`), and `*` goes to `NotFoundPage` (`src/App.jsx:31`).
  All of them sit inside one `Suspense` whose fallback is `PageLoading`
  (`src/App.jsx:7-13`, `src/App.jsx:17`).
- `src/data/widgetRegistry.js:3` exports `widgetRegistry`, the list every
  widget must be added to.

## Layout

| Path | Role |
| --- | --- |
| `src/data/widgetRegistry.js` | Widget metadata plus a `React.lazy` import per widget (`src/data/widgetRegistry.js:12`, `:26`, `:40`, `:57`) |
| `src/pages/HomePage.jsx` | Cards for entries with `status === 'published'` (`src/pages/HomePage.jsx:5-7`) |
| `src/pages/NotFoundPage.jsx` | Catch-all page with a link back to `/` (`src/pages/NotFoundPage.jsx:8`) |
| `src/hooks/useEmbedMode.js` | Embed flag from `?embed=1` (`src/hooks/useEmbedMode.js:3-6`) |
| `src/components/common/MathFormula.jsx` | KaTeX renderer (`src/components/common/MathFormula.jsx:12`) |
| `src/components/common/ProbabilitySlider.jsx` | Range input from 0 to 1 with label and value (`src/components/common/ProbabilitySlider.jsx:17-28`) |
| `src/components/common/ProbabilityStackedBar.jsx` | Stacked probability bar (`src/components/common/ProbabilityStackedBar.jsx:23`) |
| `src/widgets/probability/` | `BayesTheoremPage.jsx`, and `ExpectedValuePage.jsx` with `expectedValueModel.js` |
| `src/widgets/statistics/` | `LikelihoodMlePage.jsx` with `likelihoodModel.js` |
| `src/widgets/linear-algebra/` | `DotProductProjectionPage.jsx` with `dotProductModel.js` |
| `src/styles/global.css` | Global and catalogue styles, plus the `html[data-embed='true']` rules (`src/styles/global.css:164-169`) |

Each widget page default-exports one component
(`src/widgets/probability/BayesTheoremPage.jsx:47`,
`src/widgets/probability/ExpectedValuePage.jsx:237`,
`src/widgets/statistics/LikelihoodMlePage.jsx:739`,
`src/widgets/linear-algebra/DotProductProjectionPage.jsx:333`). Each one
calls `useEmbedMode()` first (`BayesTheoremPage.jsx:48`,
`ExpectedValuePage.jsx:238`, `LikelihoodMlePage.jsx:740`,
`DotProductProjectionPage.jsx:334`), styles itself with its own CSS module,
and links home with `<Link to="/">` (`ExpectedValuePage.jsx:299`,
`LikelihoodMlePage.jsx:777`, `DotProductProjectionPage.jsx:383`,
`BayesTheoremPage.jsx:105-107`). Model files hold only pure exported
functions and constants (for example the constants at
`src/widgets/statistics/likelihoodModel.js:1-10`, `calculateLogLikelihood` at
`:34` and `generateLikelihoodCurve` at `:118`).

## Depends on / depended on by

- External packages: `react` and `react-dom/client` (`src/main.jsx:1-2`),
  `react-router` (`src/main.jsx:3`, `src/App.jsx:2`), `katex`
  (`src/components/common/MathFormula.jsx:2`), and `recharts`
  (`src/widgets/statistics/LikelihoodMlePage.jsx:3-13`,
  `src/widgets/probability/ExpectedValuePage.jsx:8`). The dot-product widget
  draws raw SVG instead of using recharts
  (`DotProductProjectionPage.jsx:144`, with geometry from
  `src/widgets/linear-algebra/dotProductModel.js:11-13` and `:69`).
- Internal direction: `main.jsx` → `App.jsx` → `widgetRegistry.js` → widget
  pages → `components/common/`, `hooks/` and the widget's own model.
  `HomePage.jsx` also reads the registry (`src/pages/HomePage.jsx:2`).
  Every widget uses `MathFormula`. Only `BayesTheoremPage.jsx` uses
  `ProbabilitySlider` and `ProbabilityStackedBar`. Widgets never import each
  other.
- Depended on by: `index.html` loads `/src/main.jsx`. Nothing else does.

## What trips a newcomer

- Routes come from the registry, not from hand-written `Route` elements
  (`src/App.jsx:20-30`). The section "4. App.jsx에 위젯 URL 등록" of
  `how_to.md` (`how_to.md:428`) still says to import the page and add a
  `Route` in `App.jsx`. Doing that now would duplicate the route; add a
  registry entry instead.
- Only entries with `status: 'published'` appear on the home page
  (`src/pages/HomePage.jsx:6`), but every entry gets a route whatever its
  status (`src/App.jsx:20`).
- The registry's check throws on a missing required field or a duplicate id
  or path (`src/data/widgetRegistry.js:63`, `:80`, `:86`, `:90`). It runs
  only under `import.meta.env.DEV`, so a production build does not catch
  these.
- Registry entries are not uniform. The Bayes entry has no `subject` or
  `tags` and uses the category `확률과 통계` (`src/data/widgetRegistry.js:7`),
  while the expected-value entry uses `확률` (`src/data/widgetRegistry.js:22`).
  `subject` and `tags` are optional and nothing reads them yet.
- Embed mode reads `window.location.search` (`src/hooks/useEmbedMode.js:4`),
  not the hash. With `HashRouter` (`src/main.jsx:10`) the flag has to come
  before the `#`: `/?embed=1#/widgets/...` works and
  `/#/widgets/...?embed=1` does not (`how_to.md:707` says the same). The
  flag is read once per mount (`src/hooks/useEmbedMode.js:9`).
- `useEmbedMode` only sets `data-embed` on `<html>`
  (`src/hooks/useEmbedMode.js:12`). The borderless layout comes from each
  widget's own `--embed` class in its CSS module (for example
  `src/widgets/linear-algebra/DotProductProjectionPage.module.css:7`,
  `src/widgets/probability/BayesTheoremPage.module.css:7`), so a new widget
  must add that class itself.
- `BayesTheoremPage.jsx` has no model file. Its constants, formatters and
  posterior calculation live in the page (`BayesTheoremPage.jsx:11-15`,
  `:31-45`, `:58`). The other three widgets keep their logic in a
  `*Model.js` file.
- Each model file defines its own `clamp` and `normalize*` helpers
  (`dotProductModel.js:17`, `expectedValueModel.js:11`,
  `likelihoodModel.js:17`). There is no shared math utility.
- `MathFormula` renders KaTeX HTML through `dangerouslySetInnerHTML`
  (`src/components/common/MathFormula.jsx:32`). That is safe only because
  every formula is a hard-coded string. On a parse error it shows an inline
  message and logs to the console (`MathFormula.jsx:19-26`, `:34-39`).
- `StrictMode` (`src/main.jsx:9`) runs effects twice in dev, so the cleanup
  in `useEmbedMode` that deletes `data-embed`
  (`src/hooks/useEmbedMode.js:15`) runs and is undone on every dev mount.
- Nothing imports these Vite template leftovers: `src/App.css`,
  `src/index.css`, `src/assets/hero.png`, `src/assets/react.svg`,
  `src/assets/vite.svg`.
- There are no tests. The pure model files are the natural place to start.
