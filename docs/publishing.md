# Publishing and sharing A11y Doctor

How to get the skill to other people on **Claude (Claude Code, claude.ai), OpenAI (Codex,
ChatGPT), GitHub Copilot and Cursor**: for yourself, for your team, and publicly.

A11y Doctor follows the open [Agent Skills](https://agentskills.io) format, so **one folder
(`a11y-doctor/`) works everywhere**. What differs is *where* each tool looks for it, and which
catalogs you can list it in.

## At a glance

| Platform | Personal / team install | Public listing | Status in this repo |
|---|---|---|---|
| **Any agent** (75+ incl. Claude Code, Codex, Cursor, Copilot) | `npx skills add dhanugupta/a11y-doctor` | [skills.sh](https://skills.sh) indexes public repos as people install them | ✅ works today (tested) |
| **Claude Code** | Plugin marketplace: `/plugin marketplace add dhanugupta/a11y-doctor` | [Anthropic's directory](https://claude.ai/directory) (review required) | ✅ marketplace files included, validated with `--strict` |
| **claude.ai** (web / desktop) | Upload `dist/a11y-doctor.zip` in Settings → Capabilities → Skills | Via Anthropic's directory (as a plugin) | ✅ `npm run package` builds the zip |
| **OpenAI Codex** | `.agents/skills/` in the repo or `~/.agents/skills/` | OpenAI plugins (for wider distribution) | ✅ `install.mjs --target agents` |
| **ChatGPT** | Skills created in Codex projects show in the desktop app's Skills sidebar | No public upload store for skills | — |
| **GitHub Copilot** | `.claude/skills/`, `.github/skills/` or `.agents/skills/`; `gh skill install` | [github/awesome-copilot](https://github.com/github/awesome-copilot) (pull request) | ✅ default install works |
| **Cursor** | `.claude/skills/`, `.cursor/skills/` or `.agents/skills/` | [Cursor Marketplace](https://cursor.com/marketplace/publish) (plugin submission) | ✅ default install works |

---

## Before you share publicly: checklist

1. **License:** MIT (`LICENSE`), also declared in the `SKILL.md` frontmatter,
   `.claude-plugin/plugin.json` and `package.json`. Keep the copyright line when you update it.
2. **Keep the repo public** (it is now). `npx skills`, `gh skill` and public listings need it.
   For a private team-only release, keep the repo private; everything below still works for
   people who can clone it.
3. **Run the checks:**
   ```bash
   npm run check                       # spec validator + unit tests + evals
   claude plugin validate --strict .   # Claude Code marketplace + plugin manifest
   ```
4. **Version it.** Bump `metadata.version` in `a11y-doctor/SKILL.md` and `version` in
   `.claude-plugin/plugin.json` together, and add an entry to `CHANGELOG.md`. Claude Code users
   only receive an update when `version` changes.
5. **Tag a release and attach the zip:**
   ```bash
   npm run package                     # → dist/a11y-doctor.zip
   git tag v0.2.0 && git push origin v0.2.0
   # then create a GitHub release for v0.2.0 and attach dist/a11y-doctor.zip
   ```

---

## 1. Any agent: the `skills` CLI (simplest public route)

The open-source [`skills` CLI](https://github.com/vercel-labs/skills) installs a skill from a
GitHub repo into any of 75+ agents. It finds `a11y-doctor` in this repo as-is (tested).

```bash
npx skills add dhanugupta/a11y-doctor                       # pick agents interactively
npx skills add dhanugupta/a11y-doctor -a claude-code -a cursor -a codex -a github-copilot
npx skills add dhanugupta/a11y-doctor -g                    # global: every project on this machine
```

- **Listing:** there's no submission form. [skills.sh](https://skills.sh) lists public GitHub
  repos based on (anonymous) install counts, so share the command above to get listed.
- **Updates:** users re-run the command.

## 2. Claude Code: plugin marketplace (installs by name, gets updates)

This repo is its own marketplace (`.claude-plugin/marketplace.json` + `plugin.json`).
Users run:

```bash
claude plugin marketplace add dhanugupta/a11y-doctor
claude plugin install a11y-doctor@a11y-doctor
```

or, inside a session: `/plugin marketplace add dhanugupta/a11y-doctor`, then
`/plugin install a11y-doctor@a11y-doctor`.

- **Updates:** `claude plugin update a11y-doctor@a11y-doctor` after you bump `version`. Users
  can turn on auto-update for the marketplace.
- **Whole team, automatically:** commit this to the project's `.claude/settings.json`. Team
  members are then prompted to install it when they open the repo:
  ```json
  {
    "extraKnownMarketplaces": {
      "a11y-doctor": { "source": { "source": "github", "repo": "dhanugupta/a11y-doctor" } }
    },
    "enabledPlugins": { "a11y-doctor@a11y-doctor": true }
  }
  ```
- **Simpler alternative:** commit `.claude/skills/a11y-doctor/` into the project
  (`node install.mjs <project>`). No marketplace needed, and it also works in Cursor and
  Copilot.
- **Public listing:** submit through [Anthropic's directory](https://claude.ai/directory/manage)
  developer portal (paid claude.ai plan required; plugins are reviewed). Run the
  [pre-submission checklist](https://claude.com/docs/plugins/pre-submission-checklist#run-the-checks-before-you-submit)
  first. A directory listing reaches claude.ai, Cowork and Claude Code users.

> When installed as a plugin, the skill is namespaced: `/a11y-doctor:a11y-doctor`. Installed
> as a plain skill, it's `/a11y-doctor`. Either way it also activates automatically.

## 3. claude.ai (web and desktop apps)

```bash
npm run package        # validates, then writes dist/a11y-doctor.zip
```

Then in claude.ai: **Settings → Capabilities → Skills → Upload skill**, and choose the zip.
Code execution must be enabled. This is available on Pro, Max, Team and Enterprise.

- **Team / Enterprise:** organization Owners can provision skills for everyone. Skills you
  upload yourself are personal.
- **What works there:** claude.ai has no access to your local repo, so the skill works mostly
  as expert guidance (reviewing pasted or uploaded code, writing fixes, generating screen
  reader test scripts). The repo scanning scripts are designed for coding agents.

## 4. OpenAI Codex (and ChatGPT)

Codex reads skills from **`.agents/skills/`**, not `.claude/skills/`.

```bash
node install.mjs /path/to/project --target agents   # .agents/skills (Codex, Cursor, Copilot)
node install.mjs /path/to/project --target both     # Claude Code + Codex in the same repo
node install.mjs --global --target agents           # ~/.agents/skills, every project
# or
npx skills add dhanugupta/a11y-doctor -a codex
```

- **Team:** commit `.agents/skills/a11y-doctor/` to the repo.
- **ChatGPT:** skills from your Codex projects appear in the ChatGPT desktop app's **Skills**
  sidebar. There's no public upload store for skills. For wider distribution, OpenAI points
  to packaging as a [plugin](https://developers.openai.com/plugins/build/plugins).
- `--target both` puts the skill in two folders. Cursor and Copilot read both, so they may list
  it twice. Use it only when the team mixes Claude Code and Codex.

## 5. GitHub Copilot (VS Code, Copilot CLI, cloud agent)

Copilot reads `.github/skills/`, `.claude/skills/` and `.agents/skills/` in a repo, and
`~/.copilot/skills/` or `~/.agents/skills/` for personal skills, so the default
`node install.mjs <project>` already works.

With the GitHub CLI:

```bash
gh skill install dhanugupta/a11y-doctor a11y-doctor                  # project scope
gh skill install dhanugupta/a11y-doctor a11y-doctor --scope user     # every project
gh skill install dhanugupta/a11y-doctor a11y-doctor --pin v0.2.0     # pin to a release tag
```

- **Team:** commit the skill folder to the repo. The Copilot cloud agent then uses it on
  issues and pull requests too.
- **Public listing:** open a pull request to
  [github/awesome-copilot](https://github.com/github/awesome-copilot) adding the skill,
  following its contributing guide.

## 6. Cursor

Cursor reads `.cursor/skills/`, `.agents/skills/` and `.claude/skills/` (and the `~/` versions),
so the default install works. `--with-rules` also adds an always-on Cursor rule
(`.cursor/rules/a11y.mdc`).

```bash
node install.mjs /path/to/project --with-rules
# or
npx skills add dhanugupta/a11y-doctor -a cursor
```

- **Team:** commit the skill folder. Private team marketplaces are rolling out in Cursor for
  central sharing.
- **Public listing:** Cursor's [Marketplace](https://cursor.com/marketplace/publish) accepts
  plugin submissions (skills, rules, MCP servers and more bundled together). Submissions are
  reviewed; see [cursor.com/docs/plugins](https://cursor.com/docs/plugins) for the plugin
  format.

---

## Which route should I use?

| Goal | Route |
|---|---|
| Try it yourself | `npx skills add dhanugupta/a11y-doctor -g` |
| One repo, whole team, every agent | `node install.mjs <repo> --with-rules` and commit `.claude/skills` (+ `--target both` if anyone uses Codex) |
| Claude Code users who want updates by command | Plugin marketplace (section 2) |
| Non-developers on claude.ai | Upload the zip (section 3) |
| Maximum public reach | Tag a release, share the `npx skills` command, then submit to Anthropic's directory, awesome-copilot and the Cursor Marketplace |
