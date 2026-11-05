---
scope: project
severity: landmine
repeat: rule
triggers: ["css ?module", "module\\.css", "className", "클래스", "스타일이? (안|적용)", "안 먹", "styles\\[", "임베드 (모드|스타일)", "embed-mode", "--embed"]
slots: []
sources: [git:f459b83, src/widgets/probability/BayesTheoremPage.jsx#L99]
links: [grid-tracks-min-zero, embed-flag-before-hash]
---

# Every class a CSS module styles must actually be applied through `styles[...]`

Rule. When you add or rename a selector in a `*.module.css` file, find the
element that gets it through `styles['name']` (or `styles.name`) in the
matching `.jsx`, and when you rename or drop a `styles[...]` use, update the
selectors. In particular, each widget's embed variant (`page--embed`,
`bayes-page--embed`, `embed-mode`, `expected-value-page--embed`) only takes
effect if the page's `<main>` `className` includes it when `useEmbedMode()`
is true. After an embed change, open `/?embed=1#/widgets/...` and confirm the
compact rules really apply.

Why. Commit `f459b83` fixed two dead selectors in the Bayes widget. The
module had a whole compact block under `.embed-mode` (the
`/* Notion 임베드에서 세로 공간을 줄이기 위한 압축 모드 */` section), but the
page never applied `styles['embed-mode']`; the fix added it to the class list
(`src/widgets/probability/BayesTheoremPage.jsx:99`). Rules for
`.embed-mode .bayes-widget__panel` targeted a class no element had; they were
rewritten to `.control-panel` and `.result-panel`.

What goes wrong. CSS modules hash class names, so a selector with no
`styles[...]` user compiles silently, and an unknown `styles['x']` evaluates
to `undefined` and puts the text `undefined` into `className` without an
error. Lint and build pass and the embed simply looks uncompressed.
