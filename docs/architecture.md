# A11y Doctor architecture

How the skill and its engine audit, fix and verify accessibility issues. The diagrams are
[Mermaid](https://mermaid.js.org), which renders on GitHub and in most Markdown viewers.

1. [System overview](#1-system-overview): who talks to what
2. [How an agent loads the skill](#2-how-an-agent-loads-the-skill): progressive disclosure
3. [Audit → Fix → Verify flow](#3-audit--fix--verify-flow): the end-to-end process
4. [Audit engine internals](#4-audit-engine-internals): what `audit.mjs` does
5. [Static analysis pipeline](#5-static-analysis-pipeline): heuristics + ESLint, per workspace
6. [Runtime analysis pipeline](#6-runtime-analysis-pipeline): axe + keyboard walk + screen reader preview
7. [Agent session sequence](#7-agent-session-sequence): one request, start to finish
8. [Team workflow: baseline and PR gate](#8-team-workflow-baseline-and-pr-gate)
9. [Finding lifecycle](#9-finding-lifecycle): from raw result to report
10. [Design principles](#10-design-principles)

---

## 1. System overview

```mermaid
flowchart LR
    dev(["👩‍💻 Developer"])
    ci(["⚙️ CI (GitHub Actions)"])

    subgraph agents["AI coding agents"]
        cc["Claude Code"]
        cur["Cursor"]
        cop["GitHub Copilot"]
    end

    subgraph skill[".claude/skills/a11y-doctor"]
        md["SKILL.md<br/>workflow + rules"]
        refs["references/<br/>WCAG checklist, framework,<br/>ARIA, screen reader guides"]
        scripts["scripts/<br/>audit engine (Node, no deps)"]
        assets["assets/<br/>lint configs, test templates,<br/>CI workflow, agent rules"]
    end

    subgraph project["Your project"]
        code["Source code (read · fixed)<br/>React · Next · Angular · Vue · RN"]
        tools["Project tooling, reused if present<br/>ESLint a11y plugins · Playwright · axe"]
        app["Running app / Storybook (scanned)"]
        out["Reports written to .a11y-doctor/<br/>report.md · report.json<br/>sr-script.md · baseline.json"]
    end

    dev -- "asks in plain language<br/>or /a11y-doctor" --> agents
    agents -- "loads" --> md
    md -. "loads on demand" .-> refs
    agents -- "runs" --> scripts
    agents -- "edits (fixes)" --> code
    agents -. "copies when needed" .-> assets
    scripts --> code
    scripts --> tools
    scripts --> app
    scripts --> out
    ci -- "runs --changed --fail-on" --> scripts
    dev -- "runs CLI directly" --> scripts
```

- **One skill folder serves three agents.** Claude Code, Cursor and Copilot all read
  `.claude/skills/`.
- **The engine has no dependencies.** It *reuses* the project's own ESLint plugins and
  Playwright when present, and falls back to its built-in checks when they're not.
- **The same scripts serve three callers:** the agent, a developer at the terminal, and CI.

---

## 2. How an agent loads the skill

Agents load skills in stages ("progressive disclosure"), so the skill costs little until
it's needed. Token figures are estimates (≈4 characters per token); `npm run validate`
prints the current sizes.

| Stage | When | ≈ Tokens |
|---|---|---|
| Name + description | every session, in every agent with the skill installed | ≈160 |
| `SKILL.md` body | when accessibility comes up | ≈1.7k |
| Framework + topic reference | when fixing (e.g. `react.md` + `forms.md`) | ≈2.5k |
| WCAG checklist | only for the manual-review part of an audit | ≈3k |
| Scanner output | console summary, grouped by rule | usually < 1k |
| All references | never loaded together | ≈21k |

The description is longer than the ~100-token norm on purpose: its trigger words
(VoiceOver, NVDA, ARIA, contrast, focus…) are how agents decide to activate the skill.

How the token cost is kept down:
- **Grouped output**: findings are grouped by rule in the console and `report.md`, so a rule's
  message, WCAG criterion and fix are printed once, not per instance. In a 46-finding example,
  `report.md` went from ≈6.7k to ≈3.7k tokens. `--rule <id>` lists every location of one rule
  when fixing it.
- **Reading rules in `SKILL.md`**: start from the console summary, never read `report.json`
  or script source, and load references only per stack and topic.
- **Split references**: core screen reader guidance (`screen-readers.md`) is separate from
  mobile, JAWS and Guidepup material (`assistive-tech.md`).

```mermaid
flowchart TD
    start(["Session starts"]) --> meta["Load name + description only<br/>(≈160 tokens, every session)"]
    meta --> ask{"Does the request mention<br/>accessibility, a11y, WCAG, ARIA,<br/>screen reader, focus, contrast…?"}
    ask -- "no" --> idle(["Skill stays dormant"])
    ask -- "yes / or /a11y-doctor" --> body["Load SKILL.md body<br/>(≈1.7k tokens: workflow, severity,<br/>fix rules, reference index)"]
    body --> detect["Run detect-stack.mjs"]
    detect --> pick["Load ONLY the references for this stack<br/>e.g. react.md + native-react-native.md"]
    pick --> topic{"Topic-specific need?"}
    topic -- "custom widget" --> aria["aria-patterns.md"]
    topic -- "form / errors" --> forms["forms.md"]
    topic -- "focus / keyboard" --> kb["keyboard-focus.md"]
    topic -- "contrast / size" --> vis["visual.md"]
    topic -- "verification" --> sr["screen-readers.md<br/>manual-verification.md<br/>(assistive-tech.md for mobile)"]
    topic -- "user asks for AAA" --> aaa["aaa.md"]
```

---

## 3. Audit → Fix → Verify flow

The core process the skill teaches the agent.

```mermaid
flowchart TD
    req(["Request: audit / fix / check my changes / scan URL"]) --> scope

    subgraph S0["0 · Scope"]
        scope{"What was asked about?"}
        scope -- "a component / folder" --> sp["paths"]
        scope -- "my branch / PR" --> sc["--changed"]
        scope -- "a running page" --> su["--url"]
        scope -- "component library" --> ss["--storybook"]
        scope -- "whole project" --> sa["project"]
    end

    sp & sc & su & ss & sa --> chosen(["scope chosen"])
    chosen --> detect

    subgraph S1["1 · Audit"]
        detect["detect-stack.mjs<br/>frameworks per workspace · tooling ·<br/>references to load · testing gaps"]
        detect --> run["audit.mjs (scope)"]
        run --> rep[["report.md / report.json<br/>sr-script.md"]]
        rep --> review["Agent reviews code against the WCAG checklist<br/>(what tools can't judge: widgets, focus flow,<br/>live regions, meaning of alt text)"]
    end

    review --> prio

    subgraph S2["2 · Prioritize"]
        prio["Sort: 🔴 critical → 🟠 serious → 🟡 moderate → ⚪ minor"]
        prio --> root["Group by root cause<br/>(shared component? design token?)"]
    end

    root --> fix

    subgraph S3["3 · Fix (loop)"]
        fix["Fix one batch<br/>native HTML first · minimal diff ·<br/>never silence a rule · don't invent meaning"]
        fix --> rescan["Re-run the same audit command"]
        rescan --> delta{"Delta:<br/>N fixed · N new · N remaining"}
        delta -- "new issues introduced" --> revert["Fix or revert that change"] --> rescan
        delta -- "remaining & progress" --> fix
        delta -- "clean, or 3 rounds<br/>without progress" --> done
    end

    done["Scope clean / remaining explained"] --> verify

    subgraph S4["4 · Verify"]
        verify["Project lint + tests still pass"]
        verify --> keyb["Keyboard walk-through<br/>(expected Tab order)"]
        keyb --> srs["Screen reader script<br/>VoiceOver + NVDA (+ mobile)<br/>voice control check"]
        srs --> lock["Offer regression tests<br/>(jest-axe · Playwright+axe · Guidepup)"]
    end

    lock --> report

    subgraph S5["5 · Report"]
        report[["Before → after counts · fixes with file:line + WCAG ·<br/>needs-human-review · manual checks · tooling gaps"]]
    end
```

---

## 4. Audit engine internals

`scripts/audit.mjs` orchestrates the modules. Everything is plain Node.js (20+), with no
install step.

```mermaid
flowchart TB
    cli["audit.mjs<br/>CLI · options · exit code"]

    subgraph scope["Scope"]
        scopeLib["lib/scope.mjs<br/>--changed (git merge-base + uncommitted + untracked)<br/>paths expansion"]
        proj["lib/project.mjs<br/>file walk · ignore dirs · resolve project packages"]
    end

    detect["detect-stack.mjs<br/>workspaces · frameworks · package manager ·<br/>tool versions · testing gaps · references"]

    subgraph static["Static analysis"]
        ss["static-scan.mjs"]
        parser["lib/tag-parser.mjs<br/>JSX · HTML/Angular · Vue · Android XML"]
        heur["lib/heuristics.mjs<br/>~30 checks + suppressions"]
        aria["lib/aria.mjs<br/>ARIA roles/attrs vocabulary"]
        rules["lib/rules-map.mjs<br/>lint rule → WCAG + severity"]
    end

    subgraph runtime["Runtime analysis"]
        rs["axe-scan.mjs<br/>Playwright + axe-core · keyboard walk"]
        srp["lib/sr-preview.mjs<br/>accessibility tree → announcements · sr-script"]
    end

    subgraph post["Post-processing"]
        find["lib/findings.mjs<br/>dedupe · fingerprint · sort · severity"]
        wcag["lib/wcag.mjs<br/>55 A/AA criteria · axe tag mapping"]
        report["lib/report.mjs<br/>report.md · console summary"]
    end

    cli --> detect
    cli --> scopeLib --> proj
    cli --> ss --> parser --> heur --> aria
    ss --> rules
    cli --> rs --> srp
    ss & rs --> find --> wcag
    find --> base{"baseline.json?"}
    base --> delta["delta vs report.prev"]
    delta --> report
    report --> files[[".a11y-doctor/<br/>report.md · report.json · sr-script.md"]]
    cli --> exit{"--fail-on threshold met?"}
    exit -- yes --> e1(["exit 1"])
    exit -- no --> e0(["exit 0"])
```

---

## 5. Static analysis pipeline

Two layers run on every file. The built-in heuristics always run. The project's own ESLint
a11y plugins add depth when installed. Each plugin runs in isolation, so one broken parser
can't disable the others.

```mermaid
flowchart LR
    files["Files in scope"] --> route{"Which workspace?<br/>(detect-stack)"}
    route -- "React Native package" --> rn["native rules"]
    route -- "web package" --> web["web rules"]

    subgraph H["Layer 1 · Built-in heuristics (always on)"]
        parse["Tag parser<br/>normalizes onClick · (click) · @click,<br/>aria-* · [attr.aria-*] · :aria-*"]
        checks["Checks: alt text · names · labels ·<br/>keyboard · ARIA validity · focus CSS ·<br/>media · zoom · auth · RN · Android XML"]
        sup["Suppressions: patterns known to be fine<br/>(stopPropagation, backdrops, {...props},<br/>hidden iframes, Link asChild)"]
        parse --> checks --> sup
    end

    subgraph E["Layer 2 · Project ESLint plugins (if installed)"]
        g1["jsx-a11y group<br/>(web files)"]
        g2["react-native-a11y group<br/>(RN files)"]
        g3["@angular-eslint/template<br/>(+ inline templates)"]
        g4["vuejs-accessibility"]
    end

    rn & web --> H
    rn --> g2
    web --> g1 & g3 & g4
    sup -- "drop matching lint<br/>false positives" --> merge
    g1 & g2 & g3 & g4 --> merge["Merge → same Finding shape<br/>rule · severity · WCAG · file:line · fix"]
```

---

## 6. Runtime analysis pipeline

For `--url` and `--storybook`. It uses the project's Playwright and `@axe-core/playwright`.

```mermaid
flowchart TD
    targets["URLs / Storybook stories<br/>(capped by --max-pages)"] --> open["Open in headless Chromium"]
    open --> axe["axe-core with WCAG 2.2 A/AA tags<br/>wcag2a · wcag2aa · wcag21a · wcag21aa · wcag22aa"]
    axe --> v["violations → findings<br/>(impact = severity)"]
    axe --> inc["incomplete → needs human review"]

    open --> tree["Accessibility tree snapshot"]
    tree --> prev["Screen reader preview<br/>headings (Rotor/H key) · landmarks ·<br/>form controls · structure warnings"]

    open --> walk["Keyboard walk: press Tab repeatedly"]
    walk --> each["At each stop"]
    each --> ann["Expected announcement<br/>name · role · state · value · description"]
    each --> trap{"Focus stuck?"} -- yes --> f1["2.1.2 focus trap (critical)"]
    each --> obs{"Covered by fixed/sticky?"} -- fully --> f2["2.4.11 focus obscured (serious)"]
    each --> ind{"Outline / box-shadow?"} -- none --> f3["2.4.7 verify focus style (review)"]

    ann & prev --> script[["sr-script.md<br/>VoiceOver + NVDA test script<br/>with Expected column filled"]]
    v & f1 & f2 --> findings[["findings"]]
```

---

## 7. Agent session sequence

One request, start to finish, e.g. *"Audit packages/ui and fix the critical issues"*.

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant Agent as AI agent
    participant Skill as SKILL.md + references
    participant Engine as audit engine
    participant Code as Project code

    Dev->>Agent: "Audit packages/ui and fix the critical issues"
    Agent->>Skill: description matches → load SKILL.md
    Agent->>Engine: detect-stack.mjs
    Engine-->>Agent: React web workspace · load react.md · testing gaps
    Agent->>Skill: load react.md (+ topic refs as needed)
    Agent->>Engine: audit.mjs packages/ui
    Engine->>Code: read files
    Engine-->>Agent: findings by severity + report.md
    Agent->>Code: review what tools can't judge
    loop until clean or no progress (max 3 rounds)
        Agent->>Code: fix one batch (minimal diff)
        Agent->>Engine: re-run audit.mjs packages/ui
        Engine-->>Agent: "N fixed · N new · N remaining"
    end
    Agent->>Code: run project lint + tests
    Agent-->>Dev: report: fixes (file:line, WCAG), needs-review,<br/>keyboard + VoiceOver/NVDA checklist, test suggestions
    opt Developer agrees
        Agent->>Code: add regression test from assets/test-templates
    end
```

---

## 8. Team workflow: baseline and PR gate

Legacy issues are recorded once, so checks only fail on **new** problems.

```mermaid
sequenceDiagram
    autonumber
    actor Lead as Tech lead
    actor Dev as Developer
    participant Repo as Git repo
    participant CI as CI workflow
    participant Engine as audit engine
    participant Agent as AI agent

    Lead->>Engine: audit.mjs --update-baseline
    Engine-->>Repo: .a11y-doctor/baseline.json (fingerprints of known issues)
    Lead->>Repo: commit baseline + install.mjs --with-ci

    Dev->>Repo: open PR with a new component
    Repo->>CI: pull_request
    CI->>Engine: audit.mjs --changed --base origin/main --fail-on serious
    Engine->>Engine: scan changed files · drop baselined fingerprints
    Engine-->>CI: 4 new critical findings · exit 1
    CI-->>Dev: ❌ check failed · report in job summary

    Dev->>Agent: "Fix the accessibility issues in my changes"
    Agent->>Engine: audit.mjs --changed (fix loop)
    Engine-->>Agent: 4 fixed · 0 new · 0 remaining
    Dev->>Repo: push fix
    Repo->>CI: re-run
    CI-->>Dev: ✅ passed (legacy issues stay baselined)
```

Fingerprints are built from *rule + file + offending code*, not line numbers, so unrelated
edits that shift lines don't make baselined issues reappear.

---

## 9. Finding lifecycle

```mermaid
stateDiagram-v2
    [*] --> Raw: heuristic / ESLint / axe / keyboard walk
    Raw --> Suppressed: known false-positive pattern
    Raw --> Normalized: map to WCAG + severity
    Normalized --> Merged: dedupe same issue from several tools
    Merged --> Fingerprinted: rule + file + code
    Fingerprinted --> Baselined: fingerprint in baseline.json
    Fingerprinted --> Open: not baselined
    Open --> Reported: report.md · report.json · console
    Reported --> Fixed: gone on next run → counted as "fixed"
    Reported --> NeedsHuman: judgment call (alt text meaning, brand color)
    Baselined --> Open: --no-baseline / baseline burned down
    Suppressed --> [*]
    Fixed --> [*]
```

| Severity | Meaning | Typical examples |
|---|---|---|
| 🔴 critical | Blocks a task for keyboard or screen reader users | unlabeled input, click-only `div`, focus trap, icon button with no name |
| 🟠 serious | Major barrier | low contrast, focus hidden by sticky header, invalid ARIA, no captions |
| 🟡 moderate | Harder to use | missing RN role, hover-only content, autofocus |
| ⚪ minor | Polish / verify | vague link text, modal backdrop (verify Escape) |

---

## 10. Design principles

| Principle | How it shows up |
|---|---|
| **Portable** | One `SKILL.md` using only Agent Skills spec fields; works in Claude Code, Cursor and Copilot. `npm run validate` enforces this. |
| **Cheap until needed** | ≈160 tokens idle (name + description); ≈1.7k for `SKILL.md` when activated; references load per stack and topic, never all at once; scanner output is grouped by rule. |
| **Zero setup, more with setup** | Built-in checks need only Node; the project's ESLint plugins and Playwright add depth automatically. |
| **Precision over noise** | Checks stay quiet when code *might* be fine; known false-positive patterns are suppressed and counted. Evals fail on any false positive. |
| **Measurable loop** | Fingerprints make "fixed / new / remaining" exact across runs. |
| **Humans for judgment** | Meaning, brand colors and screen reader experience go to "needs human review", with a ready test script. |
| **Safe by default** | The agent asks before installing packages, starting servers, changing shared design systems, or running a screen reader. |
| **Adoptable by teams** | Baseline + `--changed` + `--fail-on` lets legacy repos block only new issues. |
