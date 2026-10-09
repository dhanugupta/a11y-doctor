---
name: a11y-doctor
description: Audit and fix accessibility (a11y) against WCAG 2.2 A/AA in React, Next.js, Angular, Vue, React Native, iOS and Android code. Use for accessibility, a11y, WCAG, ADA / Section 508 / EN 301 549, screen readers (VoiceOver, NVDA, JAWS, Narrator, TalkBack, VoiceView) or screen reader test scripts, voice control (Voice Control, Voice Access, Dragon), keyboard navigation, focus management or traps, ARIA, semantic HTML, alt text, form labels or errors, color contrast, target size; auditing, reviewing or fixing a component, page, module or PR; or building accessible modals, menus, tabs, comboboxes, forms or custom controls.
license: MIT
compatibility: Node.js 20+ and git. Optional — the project's ESLint a11y plugins and playwright + @axe-core/playwright add depth; without them built-in checks and guided review are used.
metadata:
  version: "0.2.0"
  wcag: "2.2 A/AA (AAA opt-in)"
  last-reviewed: "2026-10-09"
---

# A11y Doctor

Find, prioritize, fix and verify accessibility issues against **WCAG 2.2 A + AA** with the
smallest correct change, looping **Audit → Prioritize → Fix → Verify** and re-scanning after
each round. AAA only when asked (`references/aaa.md`).

Run scripts from the project root as `node <skill-dir>/scripts/…`, where `<skill-dir>` is
this file's directory (e.g. `.claude/skills/a11y-doctor`). Never install packages, start
servers or screen readers without asking; offer the command instead.

## Keep context lean

- **Read the console summary first.** It groups findings by rule, each with WCAG criterion,
  fix and locations. To fix one rule, list all its locations with `--rule <id>`.
- **Don't read** `report.json`, or the source of `scripts/` and `assets/`. Run the scripts and
  copy the assets. Open `report.md` only for handing results to a human.
- **Load references selectively:** those `detect-stack` names, plus one topic file per kind of
  problem. Scanner findings already carry their WCAG criterion and fix. Load
  `wcag22-checklist.md` only for the manual review in step 1.
- **Prefer the narrowest scope** (a folder or `--changed` over the whole project).

## 0. Scope

| Request | Command (`audit.mjs` = `node <skill-dir>/scripts/audit.mjs`) |
|---|---|
| component / folder | `audit.mjs src/components/Modal` |
| my changes / PR | `audit.mjs --changed [--base origin/main]` |
| running page | `audit.mjs --url http://localhost:3000/checkout` (can be combined with paths) |
| component library | `audit.mjs --storybook http://localhost:6006` |
| whole project | `audit.mjs` |

## 1. Audit

1. `detect-stack.mjs`: frameworks per workspace, tooling, **references to load**, testing gaps.
2. Run the scoped `audit.mjs`. It runs the built-in checks, plus the project's ESLint a11y
   plugins if installed. With `--url`/`--storybook` it also runs axe-core, a keyboard walk,
   and a screen reader preview (`.a11y-doctor/sr-script.md`: Rotor headings/landmarks and the
   expected announcement at each Tab stop).
3. **Manual review** of what tools miss: custom widgets, focus on open/close/route change,
   form errors, live regions, reading order, and meaningful alt text and labels. Use
   `wcag22-checklist.md` and the topic references.
4. If scripts can't run, audit by reading the code with the checklist, and say so.

## 2. Prioritize

🔴 **critical**: blocks keyboard or screen reader users (unlabeled control, click-only `div`,
trap, missing alt, zoom disabled). 🟠 **serious**: major barrier (contrast, obscured focus,
invalid ARIA, positive tabindex, no captions). 🟡 **moderate**: workaround exists (autofocus,
hover-only, missing RN role). ⚪ **minor**: polish (vague link text, redundant role).

Group by **root cause**. One shared component or design token (`Button`, `IconButton`,
`Input`, `Modal`, color tokens) fixes many findings at once. Ask before changing a design
system other teams own, or brand colors.

## 3. Fix

Load the framework reference (`react.md`, `angular.md`, `vue.md`, `native-*.md`) and the
topic reference (`aria-patterns.md`, `forms.md`, `keyboard-focus.md`, `visual.md`) that match
the findings.

1. **Native HTML first** (`<button>`, `<a href>`, `<label>`, `<dialog>`, `<fieldset>`). If you
   must use ARIA, implement the full pattern.
2. **Minimal diff**: mouse behaviour and styling stay identical.
3. **Never silence a tool**: no `eslint-disable`, no `aria-hidden` or `role="presentation"`
   to dodge a rule, no deleting tests.
4. **Don't invent meaning**: if an image's purpose, an action or a label's wording is
   unclear, ask or write `TODO(a11y): confirm text`. Never `alt="image"`.
5. **Visible label wins**: reference visible text (`<label>`, `aria-labelledby`). An
   `aria-label` must start with the visible text (2.5.3).
6. **Keep focus visible**: an outline is only removed when a `:focus-visible` style of ≥3:1
   replaces it.
7. **Use the project's primitives** (React Aria, Radix, Headless UI, MUI, Angular CDK/Material,
   the project's `sr-only` class).
8. Mark uncertain fixes as **needs human review**.

**Fix loop:** fix one batch, re-run the same command, and read
`N fixed · N new · N remaining`. Repeat until clean, or until 3 rounds pass without progress
(then report what remains and why). If a fix causes new findings, fix or revert it first.

## 4. Verify

1. Re-scan: zero critical/serious in scope. Run the project's lint and tests.
2. **Keyboard**: give the expected Tab order for the changed UI
   (`manual-verification.md`).
3. **Screen reader**: you can't listen, so hand over the expected announcements. Use
   `sr-script.md` if a URL was scanned, or build the table from code with the
   accessible-name rules in `screen-readers.md`. Ask for **VoiceOver + Safari** and
   **NVDA + Firefox/Chrome** (plus VoiceOver iOS / TalkBack for mobile: `assistive-tech.md`) with exact commands,
   and a voice control check ("Click <visible label>"). For critical flows, offer
   Guidepup (`assets/test-templates/voiceover-guidepup.spec.ts`, `nvda-guidepup.spec.ts`).
4. **Lock it in**: offer a regression test from `assets/test-templates/`, and address the
   testing gaps `detect-stack` reported.

## 5. Report

Follow `assets/report-template.md`: scope, severity counts before → after, fixes with
`file:line` + WCAG, needs-review items, manual checks, and tooling gaps. Keep it skimmable.

**Teams:** `--update-baseline` (commit `.a11y-doctor/baseline.json`) plus
`--changed --fail-on serious` in CI blocks only new issues. Setup is in `tooling.md`;
templates are in `assets/ci/` and `assets/agent-rules/`.

## References, loaded on demand

| File | Load for |
|---|---|
| `references/wcag22-checklist.md` | manual review: all A/AA criteria with code-level checks |
| `references/react.md` · `references/angular.md` · `references/vue.md` | the detected web framework |
| `references/native-react-native.md` · `references/native-ios.md` · `references/native-android.md` · `references/native-flutter.md` | the detected native platform |
| `references/aria-patterns.md` | custom widgets: dialog, menu, tabs, combobox, disclosure, tooltip, toast, tables |
| `references/forms.md` | labels, validation, errors, autocomplete, authentication |
| `references/keyboard-focus.md` | focus order, traps, skip links, route changes, focus not obscured |
| `references/visual.md` | contrast, focus styles, target size, reflow, forced colors, motion |
| `references/manual-verification.md` | keyboard walk-through, finding format |
| `references/screen-readers.md` | verifying web UI: accessible-name rules, VoiceOver (macOS) and NVDA commands, voice control |
| `references/assistive-tech.md` | mobile (VoiceOver iOS, TalkBack, VoiceView), JAWS, Narrator, contrast/zoom/motion settings, Electron, Guidepup |
| `references/tooling.md` | lint/axe/Storybook setup, quick URL scanners, baseline and CI rollout |
| `references/aaa.md` | only when AAA is requested |
