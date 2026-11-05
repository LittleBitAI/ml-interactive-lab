---
scope: project
severity: contract
repeat: rule
triggers: ["위젯을? (추가|새로|만들|등록)", "새 위젯", "라우트", "Route", "App\\.jsx", "widgetCatalog", "widgetRegistry", "카탈로그", "메인 페이지.*(목록|추가)", "404", "위젯 (주소|URL)"]
slots: []
sources: [src/App.jsx#L20, src/data/widgetRegistry.js#L3, how_to.md#L428, how_to.md#L906]
links: []
---

# A widget is wired in by one entry in `src/data/widgetRegistry.js`, nowhere else

Rule. To add, rename, move or hide a widget, edit only its entry in
`src/data/widgetRegistry.js`: `id`, `title`, `category`, `description`,
`path`, `status` and a `lazy(() => import(...))` `component` are required.
Do not add an import or a `Route` for a widget in `src/App.jsx`, and do not
recreate `src/data/widgetCatalog.js`. `how_to.md` sections 4 and 5 and its
404 troubleshooting still describe that older two-list setup; follow the
registry, not those steps. Keep `path` under `/widgets/<subject>/<id>` to
match the folder `src/widgets/<subject>/`. Use `status` other than
`published` to hide a widget from the home page, knowing its route still
exists.

Why. Commit `dad176f` replaced a hand-written `Route` in `App.jsx` plus a
separate `widgetCatalog.js` list with one registry: `App.jsx:20-30` maps it to
routes and `src/pages/HomePage.jsx:5-7` maps it to cards. Before that, a
route path and a catalogue path had to be kept identical by hand, which is
exactly the failure `how_to.md:906-925` ("새 위젯 URL에서 404 또는 빈 화면이
나오는 경우") tells readers to debug.

What goes wrong. A hand-added `Route` in `App.jsx` duplicates the registry
route. A file named `widgetCatalog.js` is read by nothing. A registry entry
missing a required field, or repeating an `id` or `path`, throws at startup
in dev (`src/data/widgetRegistry.js:63-96`) but is not checked in a
production build, so run `npm run dev` once after editing the registry.
