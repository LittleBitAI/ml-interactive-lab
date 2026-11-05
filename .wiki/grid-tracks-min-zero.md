---
scope: project
severity: landmine
repeat: rule
triggers: ["레이아웃", "잘(려|리|림)", "가로로", "넘(쳐|침)", "overflow", "그리드", "grid", "minmax", "반응형", "좁은 화면", "모바일", "노션", "Notion", "임베드.*(깨|잘|좁)", "그래프.*(잘|안 보)"]
slots: []
sources: [git:f459b83, git:f934b57, git:4a89388, how_to.md#L859]
links: [css-module-classes-must-exist, gate-lint-and-build]
---

# Grid tracks use `minmax(0, …)` and grid children `min-width: 0`, or a narrow embed clips the widget

Rule. In widget CSS modules, never give a grid track a fixed minimum width
such as `minmax(300px, …)`; write `minmax(0, …)` and set `min-width: 0` on
grid and flex children that hold charts, formulas or long text. Wrap every
`recharts` chart in `ResponsiveContainer` with `width="100%"` inside a
container that also has `min-width: 0`. Before calling a layout change done,
check the widget at a narrow width (about 540–720px, the width of a Notion
embed column) in both normal and `?embed=1` mode, because lint and build do
not see layout.

Why. Three fix commits burned on this. `f459b83` added `min-width: 0` to the
Bayes header children and panels. `f934b57` replaced
`grid-template-columns: minmax(300px, 0.85fr) minmax(380px, 1.15fr)` with
`minmax(0, 0.85fr) minmax(0, 1.15fr)` in
`src/widgets/probability/BayesTheoremPage.module.css` and reworked the
breakpoints in it and in `ExpectedValuePage.module.css`. `4a89388` rebuilt the
dot-product grid with `repeat(2, minmax(0, 1fr))`. `how_to.md:859-881`
documents the same cure for charts cut off horizontally.

What goes wrong. A grid item defaults to `min-width: auto`, so a track can
never shrink below its content's intrinsic width. In a Notion embed or on a
phone the panel overflows its frame: the right column and the chart are cut
off, or the page scrolls sideways inside the iframe.
