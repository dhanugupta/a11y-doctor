# A11y Doctor

An [Agent Skill](https://agentskills.io) that helps AI coding agents (**Claude Code, Cursor, and GitHub Copilot**) **audit, fix and verify accessibility** in front-end code against **WCAG 2.2 Level A + AA**.

It covers React, Next.js, Angular, Vue, React Native, iOS, Android and Flutter.

```
Audit ──▶ Prioritize ──▶ Fix ──▶ Verify
  ▲                                │
  └──── re-scan: "3 fixed, 0 new, 1 remaining" ◀┘
```

## What you get

- **A skill (`SKILL.md`)** that teaches the agent the workflow: scope → audit → prioritize by severity → fix with the smallest correct change → verify → report. It loads only the references for your stack.
- **A zero-dependency audit engine (`scripts/audit.mjs`)** that the agent (or CI) runs:
  - built-in static checks for JSX/TSX, Angular templates (including inline ones), Vue SFCs, HTML, CSS, React Native and Android XML layouts
  - your project's own ESLint a11y plugins when they're installed (jsx-a11y, @angular-eslint/template, vuejs-accessibility, react-native-a11y)
  - **axe-core WCAG 2.2 AA** and an **automated keyboard walk** against running pages or Storybook. The walk catches focus traps, missing focus indicators and focus hidden by sticky UI (2.4.11).
  - a **screen reader preview** built from the browser's accessibility tree: headings and landmarks as VoiceOver's Rotor and NVDA's Elements List will offer them, plus the expected name, role and state at every Tab stop. It's written out as a ready-to-run VoiceOver/NVDA test script (`.a11y-doctor/sr-script.md`).
  - a **testing coverage audit**: whether the project has axe tests, keyboard tests, a screen reader test plan and a CI gate
  - results on a single severity scale with WCAG criteria and `file:line`, plus a **fix-loop delta** (fixed / new / remaining)
  - **changed-files mode** for PRs, a **baseline** for legacy code, and a **CI gate**
- **References**: all 55 A/AA criteria mapped to code checks, framework guides, ARIA widget patterns, forms, focus management, visual design, native platforms, an opt-in AAA guide, and a **screen reader and voice control guide**. That guide covers VoiceOver on macOS and iOS (Rotor, gestures, Safari setup), NVDA, JAWS, Narrator, TalkBack, VoiceView, Voice Control, Voice Access and Dragon.
- **Real screen reader tests**: Guidepup templates that drive VoiceOver and NVDA from Playwright.
- **Assets**: report template, lint configs, jest-axe / Playwright / Angular test templates, a GitHub Actions workflow, and always-on Cursor/Copilot rules.

## Guides

- **New to this?** Follow [Getting started: step by step](#getting-started-step-by-step-beginners) below. It scans a demo website in about 15 minutes, with no code needed.
- **How does it work?** [Architecture and flow diagrams](docs/architecture.md): system overview, how agents load the skill, the Audit → Fix → Verify loop, engine internals, the static and runtime pipelines, agent and CI sequences, and the finding lifecycle.
- **Using it in a real codebase?** Read [Using A11y Doctor in your own repo](docs/guide-your-repo.md), a walkthrough on a real open-source monorepo (Next.js + Expo). It covers installing the skill, the first audit, **asking your agent to fix issues** (with example prompts and the resulting diffs), re-scanning, and the team baseline + PR gate.

## Getting started: step by step (beginners)

This walkthrough takes you from nothing installed to a full accessibility report and a screen reader test script, in about 15 minutes. You don't need to know accessibility or write code.

The examples use the W3C's **Before and After Demonstration (BAD)**. It's a demo website that the W3C made *deliberately inaccessible* for practising accessibility testing, with a fixed "after" version to compare against:

- Broken version: <https://www.w3.org/WAI/demos/bad/before/home.html>
- Fixed version: <https://www.w3.org/WAI/demos/bad/after/home.html>

> Commands are shown for **macOS / Linux** (Terminal). Windows PowerShell equivalents are in [Windows notes](#windows-notes).

### Step 1: Install the prerequisites

You need **Node.js 20 or newer** and **git**. Check whether you already have them:

```bash
node --version    # should print v20.x or higher
git --version     # any version is fine
```

If either command says "command not found":

- **Node.js**: download the LTS installer from <https://nodejs.org>, or on macOS with Homebrew run `brew install node`.
- **git**: on macOS run `xcode-select --install`. On Windows, download it from <https://git-scm.com>.

Close and reopen your terminal after installing, then run the two checks again.

### Step 2: Download A11y Doctor

```bash
cd ~                                                   # go to your home folder
git clone https://github.com/dhanugupta/a11y-doctor.git     # download the project
cd a11y-doctor
npm run check                                          # optional: confirms everything works
```

`npm run check` should finish with `recall 100.0%` and `false positives 0`.

### Step 3: Create a scan workspace

Website scans use a real browser (Chromium, through Playwright) and the axe-core accessibility engine. Install them once in a separate folder, so they don't mix with any project:

```bash
mkdir -p ~/a11y-scans/demo        # a folder for this scan
cd ~/a11y-scans/demo
npm init -y > /dev/null           # creates package.json so npm can install tools here
npm i -D playwright @axe-core/playwright
npx playwright install chromium   # downloads the browser (~100 MB, first time only)
```

### Step 4: Make the scripts easy to call

Save the location of the A11y Doctor scripts in a variable. Do this in every new terminal window:

```bash
S=~/a11y-doctor/a11y-doctor/scripts
```

### Step 5: Run your first scan

Stay in `~/a11y-scans/demo` and run:

```bash
node $S/audit.mjs --url https://www.w3.org/WAI/demos/bad/before/home.html
```

The scan takes about 20–60 seconds. It:

1. opens the page in a hidden browser,
2. runs all **WCAG 2.2 Level A + AA** rules from axe-core,
3. presses **Tab** through the page like a keyboard user, checking for focus traps, invisible focus and focus hidden behind sticky bars,
4. reads the page the way a **screen reader** would: headings, landmarks, and what each control announces.

### Step 6: Read the summary in the terminal

You'll see something like:

```
a11y-doctor: 46 open finding(s) — 34 critical, 12 serious, 0 moderate, 0 minor
  🔴 critical https://www.w3.org/WAI/demos/bad/before/home.html → `img[src$="border_top.gif"]`  axe/image-alt  [1.1.1]
      Images must have alternative text. Fix any of the following: Element does not have an alt attribute
  …
```

How to read one line:

| Part | Meaning |
|---|---|
| `🔴 critical` | Severity. **Critical** blocks some users completely; fix these first. Then 🟠 serious, 🟡 moderate, ⚪ minor. |
| `→ img[src$="border_top.gif"]` | Which element on the page (a CSS selector you can search for in DevTools) |
| `axe/image-alt` | The rule that failed. Searching "axe image-alt" explains it in depth. |
| `[1.1.1]` | The WCAG success criterion (1.1.1 = Non-text Content) |
| The second line | What's wrong and how to fix it |

(Exact numbers may change if the W3C updates the demo.)

### Step 7: Open the reports

Three files are written to `.a11y-doctor/` in your scan folder:

```bash
open .a11y-doctor/report.md       # macOS (Linux: xdg-open). Best viewed in VS Code or any Markdown viewer.
open .a11y-doctor/sr-script.md
```

| File | What's inside |
|---|---|
| `report.md` | Every finding as a checklist, grouped by severity, with the fix. Also the **Tab order** with what a screen reader should announce at each stop, the page's **headings and landmarks**, items that **need human review**, and the **manual checks** automation can't do. |
| `sr-script.md` | A ready-to-follow **screen reader test script** (Step 9) with the expected announcements already filled in |
| `report.json` | The same data for tools and dashboards |

### Step 8: Compare with the fixed version

```bash
node $S/audit.mjs --url https://www.w3.org/WAI/demos/bad/after/home.html
```

The fixed page has only a handful of findings instead of dozens. This is what "after fixing" looks like. When you scan your own site, run the **same command again after each round of fixes**: the summary line `since last run: N fixed, N new, N remaining` tracks your progress.

To scan several pages in one go, repeat `--url`:

```bash
node $S/audit.mjs \
  --url https://www.w3.org/WAI/demos/bad/before/home.html \
  --url https://www.w3.org/WAI/demos/bad/before/news.html \
  --url https://www.w3.org/WAI/demos/bad/before/tickets.html
```

### Step 9: Test with a real screen reader (VoiceOver or NVDA)

Automated tools catch only part of the problems. Spend 10 minutes listening, guided by `sr-script.md`.

**macOS: VoiceOver + Safari**

1. In Safari, open **Settings → Advanced** and tick **"Press Tab to highlight each item on a webpage"**. Without it, Tab skips links in Safari.
2. Open the page you scanned in Safari.
3. Press **Cmd + F5** to turn VoiceOver on (press it again to turn it off). **VO** means holding **Control + Option**.
4. Follow `sr-script.md`:
   - **Headings**: press **VO + U** to open the Rotor, use ←/→ to choose *Headings*, and compare with section 1 of the script.
   - **Landmarks**: same Rotor, choose *Landmarks* (section 2).
   - **Tab through** the page and write down what you hear next to each "Expected" row (section 4).
   - **VO + →** reads the next item; **VO + Space** clicks the current one.
5. Optional: turn on VoiceOver Utility (**VO + F8**) → Visuals → **Show caption panel** to see the spoken text on screen.

**Windows: NVDA + Firefox or Chrome** (NVDA is free from <https://www.nvaccess.org>)

1. Start NVDA with **Ctrl + Alt + N**. The NVDA key is **Insert**.
2. **NVDA + F7** lists headings, links and landmarks. **H** jumps to the next heading, **D** to the next landmark, and **Tab** moves between controls.
3. Open **NVDA menu → Tools → Speech Viewer** to see and copy what NVDA says.

A failure is anything **missing or wrong**, such as a button announced only as "button", a missing state ("collapsed"), or silence after an action. Wording differences between screen readers are normal. More commands and voice control are in [`references/screen-readers.md`](a11y-doctor/references/screen-readers.md). iPhone and Android gestures, JAWS, Narrator and automated screen reader tests are in [`references/assistive-tech.md`](a11y-doctor/references/assistive-tech.md).

### Step 10: Scan source code (if you have a project)

If you have a React, Angular, Vue, plain HTML or React Native project, scan its code directly. No browser or running app is needed, and findings point to `file:line`:

```bash
cd ~/path/to/your-project
node $S/detect-stack.mjs          # what the project uses, which guides apply, testing gaps
node $S/audit.mjs src             # scan the src folder
node $S/audit.mjs --changed       # only files you changed on this branch
```

If your app runs locally, combine both scans: `node $S/audit.mjs src --url http://localhost:3000`. For `--url`, install the tools from Step 3 inside the project (`npm i -D playwright @axe-core/playwright`).

### Step 11: Let your AI agent do the fixing

For a full worked example with real output and many more prompts, see [Using A11y Doctor in your own repo](docs/guide-your-repo.md).


Install the skill into your project. It works in Claude Code, Cursor and GitHub Copilot:

```bash
node ~/a11y-doctor/install.mjs ~/path/to/your-project --with-rules
```

Open the project in your agent and ask in plain language:

> *"Audit the accessibility of src/components and fix the critical issues."*
> *"Check my changes for accessibility problems before I open a PR."*
> *"Scan http://localhost:3000/checkout and give me a VoiceOver test script."*

The agent scans, fixes in batches, re-scans until the findings are gone, and then gives you a report plus a keyboard and screen reader checklist for anything a human must confirm.

### Troubleshooting

| Message / problem | Fix |
|---|---|
| `command not found: node` / `npm` | Install Node.js (Step 1), then open a new terminal |
| `Runtime scan skipped: install playwright and @axe-core/playwright` | Run the commands from your scan folder (`cd ~/a11y-scans/demo`), or install them there (Step 3) |
| `Could not launch Chromium` | `npx playwright install chromium` |
| `Cannot find module …/audit.mjs` | The `S` variable is wrong or not set in this terminal. Repeat Step 4, and check the path with `ls $S`. |
| `Failed to scan <url>: Timeout` | The site is slow or blocks automated browsers. Try again, or scan fewer pages. |
| The report shows "Access denied" / bot-check content | The website blocks automation. Scan your own site or a local build instead. |
| Very few findings on a big site | Only the first screen state is scanned. Menus, dialogs and later steps need their own URLs, or Playwright tests (`assets/test-templates/`). |

**Be considerate when scanning websites you don't own.** Scan a few pages, not the whole site, and don't run scans in a loop.

### Windows notes

In **PowerShell**, Steps 3–7 become:

```powershell
mkdir $HOME\a11y-scans\demo; cd $HOME\a11y-scans\demo
npm init -y | Out-Null
npm i -D playwright @axe-core/playwright
npx playwright install chromium
$S = "$HOME\a11y-doctor\a11y-doctor\scripts"
node "$S\audit.mjs" --url https://www.w3.org/WAI/demos/bad/before/home.html
ii .a11y-doctor\report.md
```

## Install

A single location, `.claude/skills/`, is read by **Claude Code, Cursor and GitHub Copilot** (VS Code, CLI and cloud agent).

```bash
git clone https://github.com/dhanugupta/a11y-doctor.git
node a11y-doctor/install.mjs /path/to/your-project               # the skill only
node a11y-doctor/install.mjs /path/to/your-project --with-rules  # + always-on Cursor/Copilot rules
node a11y-doctor/install.mjs /path/to/your-project --with-ci     # + PR gate workflow
node a11y-doctor/install.mjs --global                            # ~/.claude/skills for all projects
```

Or copy the `a11y-doctor/` folder into any of these locations:

| Agent | Project | Personal |
|---|---|---|
| Claude Code | `.claude/skills/a11y-doctor/` | `~/.claude/skills/a11y-doctor/` |
| Cursor | `.cursor/skills/`, `.agents/skills/` or `.claude/skills/` | `~/.cursor/skills/` |
| GitHub Copilot | `.github/skills/`, `.agents/skills/` or `.claude/skills/` | `~/.copilot/skills/` |

## Use

Ask the agent in plain language. The skill activates automatically:

> *"Audit the accessibility of `src/components/Checkout`."*
> *"Check my changes for a11y issues before I open the PR."*
> *"Fix the critical accessibility issues on http://localhost:3000/login."*
> *"Make this modal keyboard and screen reader accessible."*

Or invoke it explicitly with `/a11y-doctor` (Claude Code, Cursor, Copilot).

### CLI (what the agent runs, and what you can run too)

```bash
S=.claude/skills/a11y-doctor/scripts

node $S/detect-stack.mjs                             # stack, tooling, which references apply
node $S/audit.mjs src/components/Modal               # a component or folder
node $S/audit.mjs --changed                          # files changed vs main (+ uncommitted)
node $S/audit.mjs --url http://localhost:3000        # axe + keyboard walk on a running page
node $S/audit.mjs --storybook http://localhost:6006  # every story
node $S/audit.mjs --update-baseline                  # accept existing issues (commit the baseline)
node $S/audit.mjs --changed --fail-on serious        # CI gate: exit 1 on new serious+ issues
node $S/audit.mjs src --rule heuristic/img-alt       # every location of one rule (for a fix batch)
```

Reports are written to `.a11y-doctor/report.md` (a checklist) and `report.json`.

Runtime scans use the project's Playwright:
`npm i -D playwright @axe-core/playwright && npx playwright install chromium`.

## How it speeds up fixing

| Issue type | Examples | Who fixes it |
|---|---|---|
| Mechanical | missing alt/labels, `div` click handlers, invalid ARIA, `tabindex>0`, missing `lang`, zoom disabled | Agent, then verified by re-scan |
| Pattern-level | modal focus, menus/tabs/combobox, route-change focus, live regions | Agent using the reference patterns or your component library; developer reviews |
| Design-level | contrast, target size, focus styles | Agent proposes token changes; design signs off |
| Judgment | alt text meaning, reading order, screen reader experience | Agent drafts and lists it under "needs human review" with a script |

## Repository layout

```
a11y-doctor/                 ← the skill (this folder is what gets installed)
├── SKILL.md
├── references/              wcag22-checklist, react, angular, vue, aria-patterns, forms,
│                            keyboard-focus, visual, tooling, manual-verification,
│                            screen-readers, aaa, native-*
├── scripts/                 audit.mjs, detect-stack.mjs, static-scan.mjs, axe-scan.mjs, lib/
└── assets/                  report-template, lint-configs/, test-templates/, agent-rules/, ci/
docs/architecture.md         architecture + flow diagrams (Mermaid)
docs/guide-your-repo.md      walkthrough: install, audit, agent fixes, baseline + PR gate
evals/                       fixture apps with seeded violations + recall/false-positive runner
test/                        unit tests for the engine
tools/validate-skill.mjs     Agent Skills spec + portability validator
install.mjs                  installer
```

## Development

```bash
npm run check      # validate the skill + unit tests + evals
npm run evals -- --verbose
```

To add a check: implement it in `scripts/lib/heuristics.mjs`, then add an `expect: <rule>` marker above a seeded violation in `evals/fixtures/`, plus a clean counter-example. The eval fails on any missed expectation **or** false positive.

Keep `SKILL.md` under 500 lines and its frontmatter to spec fields only (`name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`), so it stays portable across agents. `npm run validate` enforces both.

## Scope and limits

Automated tools find only part of WCAG. The skill makes the agent review the rest and hand you keyboard and screen reader checklists. A clean report is not a conformance claim.

Native coverage: React Native and Android XML have static checks. iOS (Swift), Compose and Flutter are covered by reference guidance and test tooling for now.
