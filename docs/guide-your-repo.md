# Using A11y Doctor in your own repo: a walkthrough

This guide shows the whole workflow on a real open-source project, so you can see exactly what
happens at each step and copy it into your own repo.

**Example repo:** [`t3-oss/create-t3-turbo`](https://github.com/t3-oss/create-t3-turbo)
(commit `8f945b7`), a popular starter. It's a pnpm monorepo with a **Next.js** web app, a
**TanStack Start** web app, an **Expo / React Native** mobile app and a shared React UI package.
That's a realistic, messy setup, and the steps are the same for a single React, Next.js,
Angular, Vue or React Native app.

All output below is real, from running the commands on that repo. Your numbers will differ.

> New to the command line? Do the [beginner walkthrough in the README](../README.md#getting-started-step-by-step-beginners) first. It covers installing Node.js and git.

---

## Why bother: what the skill changes day to day

| Task | Without A11y Doctor | With A11y Doctor |
|---|---|---|
| Find issues | Manual audit, or a browser extension one page at a time | One command scans every component in the repo (72 files in under a second here), with `file:line` |
| Know *why* it's wrong | Look up WCAG yourself | Every finding names the WCAG criterion, severity and the fix |
| Fix | Research the right ARIA/HTML pattern per framework | Your AI agent applies the matching pattern for React, Angular, Vue or React Native, then re-scans |
| Check the fix worked | Re-test by hand | Re-run: `since last run: 2 fixed, 0 new, 2 remaining` |
| Screen reader testing | Guess what VoiceOver should say | A generated script with the expected announcement at every Tab stop |
| Stop regressions | Hope reviewers notice | A PR gate fails only on *new* issues; legacy ones are baselined |
| Mobile + web in one repo | Different tools and rules | One scan; each workspace gets web or native rules automatically |

---

## Step 1: Get A11y Doctor (once per machine)

```bash
cd ~
git clone https://github.com/dhanugupta/a11y-doctor.git
```

## Step 2: Install the skill into your repo

```bash
cd ~/code/create-t3-turbo                       # ← your repo
node ~/a11y-doctor/install.mjs . --with-rules
```

```
✔ Copied  skill → …/create-t3-turbo/.claude/skills/a11y-doctor
✔ Added   .cursor/rules/a11y.mdc
✔ Added   .github/instructions/a11y.instructions.md
✔ Updated .gitignore
```

| File | What it does |
|---|---|
| `.claude/skills/a11y-doctor/` | The skill. **Claude Code, Cursor and GitHub Copilot** all load it from here. |
| `.cursor/rules/a11y.mdc` | Short always-on rules, so Cursor writes accessible code by default |
| `.github/instructions/a11y.instructions.md` | The same rules for GitHub Copilot |
| `.gitignore` | Ignores generated reports (`.a11y-doctor/report*`) |

Commit these files so everyone on the team gets the skill:

```bash
git add .claude .cursor .github .gitignore
git commit -m "Add a11y-doctor accessibility skill"
```

> Want it in every project on your machine instead? Run `node ~/a11y-doctor/install.mjs --global`.

## Step 3: See what A11y Doctor detects

Set a shortcut to the scripts (once per terminal), then run the stack check:

```bash
S=.claude/skills/a11y-doctor/scripts
node $S/detect-stack.mjs
```

```
Frameworks:  react, next, reactNative, expo
Workspaces:  apps/expo (react-native), apps/nextjs (next), apps/tanstack-start (react), packages/ui (react)
UI libs:     radix

Load these references:
  - references/wcag22-checklist.md
  - references/react.md
  - references/native-react-native.md

Testing coverage gaps:
  A11Y-TST-001 [critical] No automated accessibility tests (no axe in any test file).
  A11Y-TST-002 [serious] No accessibility lint plugin installed.
  A11Y-TST-005 [moderate] No screen reader test plan or expected announcements documented.
  A11Y-TST-006 [moderate] No accessibility check in CI.
  A11Y-TST-008 [minor] No a11y-doctor baseline, so CI cannot tell new issues from legacy ones.

Tooling recommendations (ask before installing):
  - Add lint rules: pnpm add -D -w eslint-plugin-jsx-a11y (see assets/lint-configs/react.eslint.config.mjs)
  - Add lint rules: pnpm --filter @acme/expo add -D eslint-plugin-react-native-a11y
  …
```

What this tells you:
- **Workspaces**: it found each app and will check the Expo app with **React Native** rules and
  the rest with **web** rules.
- **References**: which guides the agent will read (only those, to keep it fast and focused).
- **Testing coverage gaps**: how well the project *tests* accessibility. Nothing here is
  broken yet, but nothing would catch a regression either.
- **Recommendations** use your package manager (`pnpm` here). Nothing is installed unless you
  run it.

## Step 4: Run the first audit

```bash
node $S/audit.mjs apps packages
```

```
a11y-doctor: 4 open finding(s) — 0 critical, 0 serious, 4 moderate, 0 minor
  🟡 moderate apps/expo/src/app/index.tsx:34:7  heuristic/rn-touchable-role  [4.1.2]
      <Pressable> has no accessibilityRole, so screen readers won't announce it as a button.
  🟡 moderate apps/expo/src/app/index.tsx:81:7  heuristic/rn-touchable-role  [4.1.2]
  🟡 moderate apps/expo/src/app/index.tsx:109:7  heuristic/rn-touchable-role  [4.1.2]
  🟡 moderate apps/tanstack-start/src/routes/__root.tsx:41:9  heuristic/page-title  [2.4.2]
      <head> gets its contents from <HeadContent>: verify every route sets a descriptive title.
note: ESLint not installed in the project — static results come from built-in heuristics only.

Report: …/.a11y-doctor/report.md
```

How to read this:
- The **Expo "Delete" and "Create" buttons** are `Pressable`s without a role. VoiceOver and
  TalkBack read the text but don't say "button", so users don't know they can activate them.
- The **TanStack Start** app never sets a page title, so every tab and screen reader announces
  the same thing. It's marked "verify" because titles can also come from child routes.
- A well-maintained starter has few issues. On a real product, the first run usually shows
  more: unlabeled form fields, click-only `div`s, icon buttons with no name, missing alt text.
- The note means the project's own lint plugins aren't installed. Installing them (Step 3
  recommendations) adds more checks to the same command.

Open `.a11y-doctor/report.md` for the full checklist: every finding with its fix, plus the
manual checks no tool can automate.

## Step 5: Ask your agent to fix it

Open the repo in your AI coding tool:

| Tool | How to open the agent |
|---|---|
| **Claude Code** | Run `claude` in a terminal at the repo root |
| **Cursor** | Open the folder, then the Agent chat (Cmd/Ctrl + I) |
| **GitHub Copilot** | VS Code → Copilot Chat → switch to **Agent** mode |

The skill activates by itself when you mention accessibility. You can also call it explicitly
with `/a11y-doctor`.

### Example conversation

> **You:** Audit the accessibility of apps/expo and fix what you find.

What the agent does, following the skill:

1. **Detects the stack** and loads `native-react-native.md` (not the web guides).
2. **Scans** `apps/expo` and gets the three `Pressable` findings above.
3. **Prioritizes**: all three have the same cause, so it fixes them in one batch.
4. **Fixes** with the smallest change:

   ```diff
   - <Pressable onPress={props.onDelete}>
   + <Pressable onPress={props.onDelete} accessibilityRole="button">
       <Text className="text-primary font-bold uppercase">Delete</Text>
     </Pressable>
   ```

   It leaves the `Pressable` inside `<Link asChild>` alone, because the `Link` already
   provides the link role.
5. **Re-scans** to confirm:

   ```
   a11y-doctor: 2 open finding(s) — 0 critical, 0 serious, 2 moderate, 0 minor
   since last run: 2 fixed, 0 new, 2 remaining
   ```

   It keeps going until the scope is clean (here, one more `Pressable` remains).
6. **Reports** what changed (`file:line` and the WCAG criterion), what needs a human decision,
   and a short **VoiceOver/TalkBack checklist**: *"Swipe to Delete → expect 'Delete, button'.
   Double-tap → the post is removed."*

The agent won't install packages, start dev servers or turn on a screen reader without asking.

### More things to ask

| Goal | Ask |
|---|---|
| Audit one area | *"Audit the accessibility of packages/ui and list the issues by severity. Don't fix yet."* |
| Fix the worst first | *"Fix all critical and serious accessibility issues in apps/nextjs, then re-scan."* |
| Check before a PR | *"Check my changes on this branch for accessibility problems and fix them."* |
| Build something new, accessibly | *"Create an accessible confirm-delete modal in packages/ui using the Radix Dialog we already have."* |
| Fix a shared component once | *"Our IconButton is used everywhere: make it require an accessible label."* |
| Screen reader test plan | *"Scan http://localhost:3000 and give me a VoiceOver and NVDA test script."* |
| Lock in fixes | *"Add an axe regression test for the post list and a keyboard test for the delete flow."* |
| Mobile specifics | *"Make the Expo post screen work well with VoiceOver and TalkBack."* |
| Explain a finding | *"Why is a Pressable without accessibilityRole a problem, and what does TalkBack say?"* |
| Team setup | *"Set up an accessibility baseline and a CI check that blocks new serious issues."* |

**Tips for good results:**
- **Name a scope** (a folder, a component or "my changes"). Small batches give cleaner diffs.
- **Say what to fix** ("critical and serious only") and whether to fix or just report.
- **Ask for the report** at the end. It's your PR description and your manual test plan.
- **Review "needs human review" items.** Alt text wording, brand colors and reading order are
  your call.

## Step 6: Check a running page (optional, finds more)

Code scans can't see colors, layout or focus. A browser scan can.

```bash
pnpm add -D -w @axe-core/playwright playwright     # once
pnpm exec playwright install chromium               # once
pnpm dev                                            # start your app

# second terminal, from the repo root:
node $S/audit.mjs apps/nextjs --url http://localhost:3000
```

This adds:
- axe-core **WCAG 2.2 AA** results: contrast, target size, landmarks, names
- a **keyboard walk**: Tab order, focus traps, invisible focus, focus hidden behind sticky headers
- `.a11y-doctor/sr-script.md`, a **VoiceOver/NVDA script** with the expected announcement at
  every Tab stop (see the README, Step 9, for how to use it)

The scanner can't sign in. For pages behind a login, use a Playwright test with your existing
login setup (`.claude/skills/a11y-doctor/assets/test-templates/playwright-axe.spec.ts`).

## Step 7: Team workflow (baseline + PR gate)

Most repos have existing issues you can't fix in one go. The baseline records them, so checks
only fail on **new** problems.

**1. Record today's issues** and commit the baseline:

```bash
node $S/audit.mjs apps packages --update-baseline
git add .a11y-doctor/baseline.json && git commit -m "a11y baseline"
```
```
a11y-doctor: 0 open finding(s) — 0 critical, 0 serious, 0 moderate, 0 minor (+2 baselined)
```

**2. Someone adds a new component on a branch** with typical mistakes:

```tsx
// packages/ui/src/newsletter.tsx
<form onSubmit={onSubmit}>
  <img src="/newsletter.png" />
  <input type="email" placeholder="Your email" />
  <div className="btn" onClick={onSubmit}>Subscribe</div>
  <button type="button" onClick={onClose}><XIcon /></button>
</form>
```

**3. The PR check catches it**, and only it (legacy issues stay baselined):

```bash
node $S/audit.mjs --changed --fail-on serious
```
```
a11y-doctor: 4 open finding(s) — 4 critical, 0 serious, 0 moderate, 0 minor (+1 baselined)
  🔴 critical packages/ui/src/newsletter.tsx:4:7  heuristic/img-alt  [1.1.1]
  🔴 critical packages/ui/src/newsletter.tsx:5:7  heuristic/form-label  [1.3.1, 3.3.2, 4.1.2]
      Form field has no associated label. A placeholder is not a label …
  🔴 critical packages/ui/src/newsletter.tsx:6:7  heuristic/click-without-keyboard  [2.1.1, 4.1.2]
  🔴 critical packages/ui/src/newsletter.tsx:7:7  heuristic/control-name  [4.1.2]

✖ 4 finding(s) at or above "serious".        (exit code 1 → the CI check fails)
```

**4. The developer asks the agent** *"Fix the accessibility issues in my changes"*, and gets:

```tsx
const emailId = useId();
<form onSubmit={onSubmit}>
  <img src="/newsletter.png" alt="" />
  <label htmlFor={emailId}>Email address</label>
  <input id={emailId} type="email" autoComplete="email" placeholder="you@example.com" />
  <button type="submit">Subscribe</button>
  <button type="button" onClick={onClose} aria-label="Close newsletter signup">
    <XIcon aria-hidden="true" />
  </button>
</form>
```
```
a11y-doctor: 0 open finding(s) — 0 critical, 0 serious, 0 moderate, 0 minor (+1 baselined)
since last run: 4 fixed, 0 new, 0 remaining                (exit code 0 → the check passes)
```

**5. Run it automatically on every PR:**

```bash
node ~/a11y-doctor/install.mjs . --with-ci
```

This adds `.github/workflows/a11y-doctor.yml`, already adapted to your package manager (pnpm,
yarn or npm). It posts the report to the PR's job summary and fails on new serious or critical
issues. Over time, burn down the baseline: `node $S/audit.mjs apps packages --no-baseline`
shows everything.

## Daily cheat sheet

| When | Command | Or ask your agent |
|---|---|---|
| Starting work on a component | `node $S/audit.mjs path/to/component` | *"Audit and fix the accessibility of this component."* |
| Before opening a PR | `node $S/audit.mjs --changed` | *"Check my changes for accessibility issues."* |
| After fixing | re-run the same command | *"Re-scan and tell me what's left."* |
| Testing a page by ear | `node $S/audit.mjs --url <page>` → `sr-script.md` | *"Give me a VoiceOver script for this page."* |
| New screen / widget | — | *"Build this as an accessible <widget> using our component library."* |
| Weekly health check | `node $S/detect-stack.mjs` | *"What accessibility testing gaps do we have?"* |

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `note: ESLint not installed …` | Fine: the built-in checks still run. Install your framework's a11y lint plugin for deeper checks (see `detect-stack` recommendations). |
| `TypeScript ESLint parser failed to load` | Your TypeScript version is newer than typescript-eslint supports. Template and heuristic checks still run. |
| A finding is wrong for your code | Tell the agent why. To accept it permanently, include it in the baseline (`--update-baseline`). |
| `--changed` finds nothing | You're on the base branch, or there's no `origin/main`. Pass `--base <branch>`. |
| Agent doesn't use the skill | Mention "accessibility" or "a11y" in the prompt, or type `/a11y-doctor`. Check the skill exists at `.claude/skills/a11y-doctor/SKILL.md`. |
| Runtime scan skipped | Install `playwright` and `@axe-core/playwright` in the repo (Step 6). |

## What it won't do for you

- Prove conformance: automated checks find only part of WCAG. The skill always hands you a
  keyboard and screen reader checklist for the rest.
- Decide meaning: the alt text for a product photo or the wording of a label is yours to
  confirm. The agent drafts it and flags it.
- Change brand colors or shared design-system components without asking.
