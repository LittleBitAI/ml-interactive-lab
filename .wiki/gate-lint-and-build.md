---
scope: project
severity: contract
repeat: rule
triggers: ["게이트", "검증", "린트", "lint", "빌드", "build", "배포", "deploy", "커밋(하|해)", "푸시", "push", "pr ?(올|열)", "main(에|으로)? ?(머지|올)", "테스트를? (돌|실행)"]
slots: []
sources: [.github/workflows/deploy.yml#L40, package.json#L7]
links: [vite-base-and-hash-router]
---

# The gate is `npm run lint` then `npm run build`, because that is all CI runs before deploying

Rule. Before reporting a change done, committing for review or pushing to
`main`, run `npm run lint` and then `npm run build` from the repository root,
and both must pass. There is no test suite and no `test` script, so do not
claim tests passed; say that lint and build are the only checks. A push to
`main` deploys straight to GitHub Pages with no review step, so a red gate
there means the live site does not update. For a layout or embed change, also
open the widget with `npm run dev` (or `npm run preview` after the build) in
both `/#/widgets/...` and `/?embed=1#/widgets/...` and look at it at a narrow
width; lint and build cannot see layout.

Why. `.github/workflows/deploy.yml` runs `npm ci`, `npm run lint`
(`deploy.yml:40-41`, added in commit `89901a2`), `npm run build` and the Pages
deploy, on every push to `main` (`deploy.yml:4-6`). The scripts are in
`package.json:6-11`; none of them runs tests. `.wiki/adapter.toml` leaves
`gate_cmd` empty, so nothing else declares a gate.

What goes wrong. A lint error such as a `react-hooks` violation stops the
workflow before the build, and the previous deploy stays live while the push
looks merged. Layout regressions pass both commands; the fix commits
`f459b83`, `f934b57` and `4a89388` were all layout bugs no command caught (see
[grid-tracks-min-zero](grid-tracks-min-zero.md)).
