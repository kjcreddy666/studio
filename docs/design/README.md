# Studio design set

Three designs for **Studio**, an IDE where a human and agents build software together. They build on the two source specs in the repo root:

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — *what* to build (source of truth)
- [`BUILD_WORKFLOW.md`](../../BUILD_WORKFLOW.md) — *who builds what, and when* (v1)

| # | Design | File | Read it for |
|---|---|---|---|
| 1 | **Architecture: HLD + LLD** | [01-architecture-hld-lld.md](01-architecture-hld-lld.md) | system context, containers, layering, runtime scenarios, trust model; then crate-level design, protocol, agent layer, Agent Gateway, Change Ledger algorithms, PTY flow control, policy, full DDL |
| 2 | **Agent build workflow: process + implementation** | [02-agent-build-workflow.md](02-agent-build-workflow.md) | roles, task lifecycle, pipeline, phases/tracks/gates, verification layers; then the runnable kit: `tasks.toml`, `orch` CLI, agent definitions, hooks, brief and report schemas, CI, runbook |
| 3 | **UI design** | [ui/](ui/index.html): HTML, CSS, and JS for GitHub Pages | design principles, actor language, tokens with live contrast checks, components, 13 screens, flows, accessibility, and a clickable prototype of every screen ([prototype.html](ui/prototype.html)) |

**Reading order:** Design 1 Part I (HLD) → the UI design site (§1–§3, then the prototype) → Design 2 Part A → the rest as needed.

## Reviewing on GitHub Pages

The UI design is a static site with no build step. To publish it: repository **Settings → Pages → Build and deployment → Deploy from a branch**, pick this branch (or `main` after merging) and the **`/docs`** folder, then save. The site appears at `https://kjcreddy666.github.io/studio/`, with the UI design at `…/studio/design/ui/` and the prototype at `…/studio/design/ui/prototype.html`. `docs/.nojekyll` turns off Jekyll so files are served as they are. Pages on a private repository needs a paid GitHub plan.

To preview locally instead, run `python3 -m http.server --directory docs 8000` and open `http://localhost:8000/`.

## Precedence

`ARCHITECTURE.md` wins on *what*, `BUILD_WORKFLOW.md` on *who and when*, these designs on *how*. Nothing here edits the two source specs. New capabilities and clarifications are **proposals** until Jay records a decision in `docs/decisions.md` (the build workflow asks for these as decisions D-06 and D-07 before Phase 0).

## Proposed deltas

| ID | Proposal | Proposed priority | Where | Decision |
|---|---|---|---|---|
| G17 | New goal: agents are first-class users of the studio | P1 | D1 §12 | _open_ |
| H-01 | One `Actor` type for policy, ledger, presence, audit | P0 | D1 §3, §23 | _open_ |
| H-02 | Agent Gateway: MCP server over stdio→UDS for studio-launched sessions | P1 | D1 §18 | _open_ |
| H-03 | Trust profiles: Observe, Propose, Pair, Autopilot | P0 defaults / P1 UI | D1 §8, §17.1 | _open_ |
| H-04 | Approval routing into the attention queue | P1 | D1 §17.9 | _open_ |
| H-05 | Presence: agent focus shown in editor, tree, tabs | P1 | D1 §19.1, UI §6 | _open_ |
| H-06 | Attention queue ("Needs you") | P1 | D1 §19.3, UI S6 | _open_ |
| H-07 | Ask-human tool | P1 | D1 §18.2, UI S7 | _open_ |
| H-08 | Soft claims (prevent contested edits) | P2 | D1 §19.2 | _open_ |
| H-09 | Plan view from agent todo events | P1 | D1 §17.2, UI S8 | _open_ |
| H-10 | Opt-in precise tracking for hand-started CLIs | P1 | D1 §7 S2, §21.3 | _open_ |
| H-11 | `studio task submit` CLI | P2 | D1 §12, D2 §13 | _open_ |
| H-12 | Playbooks (multi-step agent pipelines) | P3 | D1 §12 | _open_ |
| H-13 | Mission Control | P1 | UI S2 | _open_ |
| CL-01 | Large-file rule: ≤ 50 MB restorable, > 50 MB hash only | clarification | D1 §12, §20.2 | _open_ |
| CL-02 | Worktree base = session baseline (HEAD + uncommitted) | clarification | D1 §17.7 | _open_ |
| CL-03 | Hooks fail open for attribution, closed for approvals | clarification | D1 §17.5 | _open_ |
| CL-04 | Studio-editor saves split open AI call windows exactly | clarification | D1 §20.3 | _open_ |
| CL-05 | Hash-chained audit log | clarification | D1 §23 | _open_ |
| CL-06 | Sessions survive window close and UI reload, end on app quit | clarification | D1 §10 D2 | _open_ |
| CL-07 | `agent_events` keyed by session, not task | clarification | D1 §24 | _open_ |

Workflow proposals (Design 2): Phase K and R01 (§7.3), track mode (§7.2, decision D-06), independent test authors T04a/T38a/T43a (§7.4), H-tasks T43–T46 and T59 (§7.4), platform tags (§7.5).

## Verification notes

- **Claude CLI facts** (flags, hook events, hook output shapes) were checked against Claude Code **2.1.314** on 2026-10-30, using `claude --help` and the CLI bundle. ARCHITECTURE §18 still applies: re-verify against the installed version at build time (R01, T32).
- **Library names** follow ARCHITECTURE Appendix A and are suggestions until R01 verifies existence, license, maintenance, and API.
- **Mermaid diagrams** render on GitHub and were syntax-checked with Mermaid 10.
- **UI site** was exercised in headless Chromium: all 13 screens render without script errors; reverting, approvals, answering, review and apply, delegation, search, settings, and the lesson flow all work; no sideways scrolling at phone width on the spec and overview pages.

### Checks

The UI site computes every token's contrast in the browser from `ui/assets/tokens.css` (52 checks, all passing). This script reproduces a few of them offline (WCAG 2.x relative luminance):

```python
def lum(hex_color):
    r, g, b = (int(hex_color.lstrip("#")[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def contrast(a, b):
    hi, lo = sorted((lum(a), lum(b)), reverse=True)
    return round((hi + 0.05) / (lo + 0.05), 2)

assert contrast("#8D8D9A", "#26262D") >= 4.5   # dark tertiary text on elevated surfaces
assert contrast("#73737F", "#26262D") >= 3.0   # dark control borders
assert contrast("#63636E", "#ECECF0") >= 4.5   # light tertiary text on chrome
assert contrast("#82828E", "#ECECF0") >= 3.0   # light control borders on chrome
```
