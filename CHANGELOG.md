# Changelog

## 0.2.0 (2026-10-09)

- **Monorepo support**: each workspace package is detected separately (web vs React Native), so web files get jsx-a11y and web rules and native files get React Native rules. Install commands use the repo's package manager (pnpm/yarn/npm), and `install.mjs --with-ci` adapts the workflow to it.
- **Fewer false positives on real codebases**:
  - JS comments inside JSX tags are no longer read as attributes.
  - `onClick={e => e.stopPropagation()}` is not flagged.
  - Modal backdrops are a minor "verify Escape" item.
  - Hidden `<noscript>` iframes are skipped.
  - `<Link asChild>` supplies the role for its `Pressable`.
  - `<head>` content injected by a component is a "verify" item.
  - The matching lint false positives are suppressed and counted in the report notes, including content passed through `{...props}` in shadcn-style wrappers.
- **Lower token cost**:
  - findings are grouped by rule in the console and `report.md`, so a rule's message, WCAG criterion and fix print once (`report.md` is about 45% smaller on a 46-finding page)
  - new `--rule <id>` flag
  - `SKILL.md` gained "keep context lean" reading rules and was tightened from ≈2.3k to ≈1.7k tokens
  - the description went from ≈200 to ≈160 tokens with all trigger words kept
  - screen reader guidance is split into core (`screen-readers.md`) and extended (`assistive-tech.md`)
  - the validator prints the context cost
- **New `docs/architecture.md`**: 9 Mermaid diagrams covering the system, skill loading, the audit/fix/verify flow, engine internals, the static and runtime pipelines, agent and CI sequences, and the finding lifecycle.
- **New guide** `docs/guide-your-repo.md`: an end-to-end walkthrough on a real open-source monorepo, with agent prompts.

- **Screen reader preview** (`audit.mjs --url`): from the browser accessibility tree it shows headings and landmarks (the VoiceOver Rotor / NVDA Elements List), form controls, and the expected name/role/state/description at every Tab stop. It writes `.a11y-doctor/sr-script.md`, a fill-in VoiceOver/NVDA test script, and flags missing `main`, skipped heading levels, unnamed controls, duplicate link names and unnamed nav landmarks.
- **New `references/screen-readers.md`**:
  - VoiceOver on macOS (Rotor, groups, Quick Nav, Caption Panel, the Safari Tab setting) and iOS (rotor, scrub, magic tap, Screen Curtain)
  - NVDA (browse vs focus mode, Speech Viewer), JAWS, Narrator, TalkBack (Display speech output) and VoiceView
  - voice control (Voice Control, Voice Access, Dragon)
  - forced colors, Switch Control, Electron/desktop shells, and Guidepup automation
- **Real screen reader test templates** with Guidepup: `voiceover-guidepup.spec.ts` and `nvda-guidepup.spec.ts`. Also added a Vue + vitest-axe template.
- **Testing coverage audit** in `detect-stack` (A11Y-TST-001…008): no axe tests, no a11y lint, no keyboard tests, test-id-only queries, no screen reader plan, no CI gate, Storybook without the a11y addon, no baseline.
- Reports now record **tool versions**.
- **References**:
  - opt-in **AAA** (`aaa.md`)
  - `aria-disabled` vs `disabled`, table captions/headers, avoiding double announcements, `aria-busy` ordering
  - forced colors, RTL and third-party embeds
  - focus-trap libraries
  - quick URL scanners (axe CLI, pa11y, Lighthouse) and version pinning
- **Fixed:** the React, Vue and Angular route-change focus snippets moved focus on first page load. They now skip it and use one `<main>` in the app shell.

## 0.1.0 (2026-10-09)

Initial skill: workflow `SKILL.md`, zero-dependency audit engine (heuristics, ESLint bridge, axe + keyboard walk), fix-loop delta, changed-files mode, baseline and CI gate, references, assets, evals.
