# Studio UI Design

> Design 3 of 3 · Status: **Proposed** · 2026-10-30
> Covers ARCHITECTURE §11.1, §11.3, §16, Appendix A rows U01–U07 and C09–C12, plus the collaboration surfaces proposed in Design 1 §12 (H-05, H-06, H-07, H-13).
> Interactive mockup (dark): the [Studio UI Design canvas](https://claude.ai/artifact/DDi8qzJJABMiexHExx5VnW) holds six artboards: S1 Workspace, S2 Mission Control, S3 Delegate, S5 Review Inbox, S6–S7 Needs you, and the design system. Press Play on an artboard to use it; toolbar links move between screens. The canvas is private until shared from its Share menu.

## Contents
1. [Design intent](#1-design-intent)
2. [Window anatomy](#2-window-anatomy)
3. [Actor visual language](#3-actor-visual-language)
4. [Design tokens](#4-design-tokens)
5. [Layout metrics](#5-layout-metrics)
6. [Components](#6-components)
7. [Screens](#7-screens)
8. [Key flows](#8-key-flows)
9. [States and edge cases](#9-states-and-edge-cases)
10. [Keyboard](#10-keyboard)
11. [Accessibility](#11-accessibility)
12. [Writing for the UI](#12-writing-for-the-ui)
13. [Implementation handoff](#13-implementation-handoff)

---

## 1. Design intent

**IntelliJ's brain, Apple's body, and a seat at the table for agents.**

| # | Principle | What it means on screen |
|---|---|---|
| 1 | **Calm canvas, live edges** | The editor stays quiet and opaque. Agent activity lives at the edges (tool windows, gutter, status bar, toolbar pill) and comes forward when Jay asks for it. |
| 2 | **Every change has a face** | Wherever code or a diff appears, its author is visible by shape, color, and name: You, an agent session, Studio, or External. |
| 3 | **Agents are colleagues, not pop-ups** | Agents have names, presence, status, and a conversation. They show up like teammates in a shared document, not as modal dialogs. |
| 4 | **You hold the pen** | Nothing reaches the main tree without Jay's acceptance unless he chose `in place`. Risky actions ask first. Reverting AI work is one click. |
| 5 | **Attention is a queue, not a siren** | One "Needs you" queue collects approvals, questions, reviews, and failures, triageable from the keyboard. Nothing steals focus while Jay types. |
| 6 | **Keyboard first, mouse friendly** | Every flow completes without a pointer. JetBrains-compatible keymap by default. |
| 7 | **Native first** | Real macOS menus, sheets, popovers, vibrancy, SF fonts. Web imitations only where the host cannot do better. |
| 8 | **Accessible by construction** | Never color alone; contrast checked numerically; Reduce Motion, Reduce Transparency, and Increase Contrast honored. |

## 2. Window anatomy

IntelliJ's layout (ARCHITECTURE §16) plus four collaboration surfaces, marked ★.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ● ● ●  [▤] payments-api ▾  ⎇ feat/token-refresh ▾ │ test ▾  ▶ ■ ↻ │ ★◆ 3 agents · 2 need you    ★[!3] [✦ Delegate] [⌕] │ toolbar
├───┬──────────────────────┬────────────────────────────────────────────────────┬────────────────────┬───┤
│ P │ Project              │ session.ts ◆●   tokens.ts ◆   checkout.ts ●          │ AI Changes          │ C │
│ S │ ▾ src                │ payments-api › src › auth › session.ts › refresh…   │ ◆ token-refresh ▾   │ I │
│ G │   ▾ auth             ├────────────────────────────────────────────────────┤ AI 3 files +142 −31 │ N │
│★A │     session.ts  ◆●   │ ★ Claude · token-refresh is editing this file.      │ [AI only|Mine|All]  │ V │
│ L │     tokens.ts   ◆    │ 17 │  export async function refreshIfNeeded(s) {     │ ①─◆─②─◆◆─③─◆─④      │   │
│   │   ▸ routes           │ 18 ◆   const msLeft = s.expiresAt - now()           │ session.ts  +64 −12 │   │
│   │ ▸ tests              │ 19 ◆   if (msLeft > REFRESH_WINDOW) return s       │ tokens.ts   +41 −19 │   │
│   │                      │ 20 ◆●  const next = await rotate(s.refresh)  ▌Claude│ session.test +37    │   │
├───┴──────────────────────┴────────────────────────────────────────────────────┴────────────────────┴───┤
│ Terminal 1 │ Terminal 2 ◆ claude (tracked) │ Agent Console │ Problems 2 │ Run                          │ bottom tool windows
│ ★ Tracking Claude CLI in Terminal 2 · hooks: certain                                                 │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ⎇ feat/token-refresh · TypeScript ✓ · ◆ 3 agents (2 need you)  · 9 AI hunks unreviewed · UTF-8 · LF · Ln 20, Col 31 │ status bar
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
Left bar: P Project · S Structure · G Git · A Agents (Mission Control) · L Learning
Right bar: C AI Changes · I Review Inbox · N Notes · V Preview
```

| Region | Contents | Collaboration role |
|---|---|---|
| Toolbar (left) | traffic lights, sidebar toggle, project and branch switchers | — |
| Toolbar (center) | run configuration selector, Run, Stop, Rerun | — |
| Toolbar (right) ★ | **agent status pill**, **Needs-you button** with count, **Delegate**, Search Everywhere | ambient awareness; one-click triage and delegation |
| Left tool windows | Project, Structure, Git, **Agents** (Mission Control), Learning | Mission Control docks here or opens as an editor tab |
| Editor | tabs with author badges, breadcrumbs, provenance gutter, **presence cursors**, banners | where the human and agent meet in the code |
| Right tool windows | AI Changes, Review Inbox, Notes/Snippets, Preview | review surfaces |
| Bottom tool windows | Terminal, Run, Problems, Agent Console, Search Results, TODO | tracked terminals; agent transcripts |
| Status bar | branch, LSP, **agent count and unreviewed AI hunks**, encoding, line ending, cursor | always-on summary |

Modes: Normal, Distraction-free (agent activity collapses to the status bar), Presentation (U07, P3).

## 3. Actor visual language

The most important visual system in the product. It answers "who wrote this?" without hovering, without color, and without reading.

| Actor | Glyph | Dark | Light | Gutter mark | Spoken label (VoiceOver) |
|---|---|---|---|---|---|
| **You** | ● circle | `#5AA7FF` | `#0A63C9` | solid bar | "Changed by you" |
| **Agent** | ◆ diamond | `#B79CFF` | `#6E3FD1` | bar with diamond notches | "Changed by Claude, session token-refresh, turn 3" |
| **Agent, then you** | ◆● | violet over blue | violet over blue | upper half notched, lower half solid | "Written by Claude, then edited by you" |
| **External** | ▲ triangle | `#F2B44B` | `#8F5600` | hatched bar | "Changed outside Studio" |
| **Studio** | ■ square | `#9BA3AF` | `#5A6170` | hollow bar | "Changed by Studio formatter" |

- **Confidence.** Anything not `Certain` shows a small `~` after the glyph and "likely" in the hover card. Ambiguous changes use a dotted outline.
- **Session hues.** Each running agent session gets a hue for its presence cursor, card accent, and console header: violet `#B79CFF`, pink `#F28FD0`, cyan `#5ED6E6`, lime `#A6E35A`, orange `#FF9F5A`, assigned round-robin. The **diamond never changes**, so "this is an agent" reads the same for every session. In the gutter every agent mark is violet, because the gutter answers "agent or me?"; the hover card names the session.
- **Shapes are the primary signal, color the secondary.** All five gutter marks stay distinguishable in grayscale and for every common color-vision deficiency.

## 4. Design tokens

Contrast ratios are WCAG 2.x, computed against the stated surfaces (script in `docs/design/README.md#checks`). Text tokens meet 4.5:1 on every surface they are used on; control borders and the focus ring meet 3:1.

### 4.1 Surfaces and lines

| Token | Dark | Light | Use |
|---|---|---|---|
| `--surface-canvas` | `#131316` | `#FFFFFF` | editor, diff bodies |
| `--surface-panel` | `#18181C` | `#F6F6F8` | tool windows |
| `--surface-chrome` | `#202026` | `#ECECF0` | toolbar, tool-window bars, status bar (vibrancy material where available) |
| `--surface-elevated` | `#26262D` | `#FFFFFF` | cards, popovers, sheets |
| `--surface-hover` | `#2C2C34` | `#E6E6EB` | hover rows |
| `--surface-selected` | `rgba(77,163,255,.18)` | `rgba(0,98,204,.12)` | selection |
| `--line-hairline` | `#2E2E36` | `#E1E1E6` | decorative separators only |
| `--line-control` | `#73737F` (≥ 3.2:1) | `#8A8A96` (≥ 3.1:1) | input and control borders |
| `--focus-ring` | `#4DA3FF` (7.1:1 on canvas) | `#0062CC` (5.8:1) | keyboard focus, 2 px |

### 4.2 Text and accent

| Token | Dark | Contrast (canvas / elevated) | Light | Contrast (canvas / chrome) |
|---|---|---|---|---|
| `--text-primary` | `#EDEDF2` | 15.9 / 12.9 | `#1D1D1F` | 16.8 / 14.3 |
| `--text-secondary` | `#B4B4C0` | 9.0 / 7.3 | `#4A4A55` | 8.7 / 7.4 |
| `--text-tertiary` | `#8D8D9A` | 5.7 / 4.6 | `#63636E` | 5.9 / 5.0 |
| `--text-disabled` | `#5E5E69` | exempt | `#A0A0AA` | exempt |
| `--accent-text` | `#4DA3FF` | 7.1 / 5.7 | `#0062CC` | 5.8 / 4.9 |
| `--accent-fill` (white label) | `#0870E0` | 4.8 with white | `#0062CC` | 5.8 with white |

The macOS accent color replaces `--accent-*` at runtime when Jay changes it in System Settings; Studio checks the result and falls back to the default if the contrast drops below 4.5:1.

### 4.3 Semantic and actor colors

| Token | Dark | Contrast (canvas / elevated) | Light | Contrast (canvas / chrome) |
|---|---|---|---|---|
| `--success` | `#3DDC84` | 10.4 / 8.4 | `#15703A` | 6.2 / 5.2 |
| `--warning` | `#FFD60A` | 13.1 / 10.6 | `#7A5A00` | 6.4 / 5.4 |
| `--danger` | `#FF6B5E` | 6.6 / 5.4 | `#C4281C` | 5.7 / 4.9 |
| `--info` | `#64D2FF` | 10.8 / 8.7 | `#006A93` | 6.0 / 5.1 |
| `--actor-you` | `#5AA7FF` | 7.4 / 6.0 | `#0A63C9` | 5.8 / 4.9 |
| `--actor-ai` | `#B79CFF` | 8.1 / 6.6 | `#6E3FD1` | 6.4 / 5.4 |
| `--actor-external` | `#F2B44B` | 10.1 / 8.2 | `#8F5600` | 6.0 / 5.1 |
| `--actor-studio` | `#9BA3AF` | 7.3 / 5.9 | `#5A6170` | 6.2 / 5.3 |

### 4.4 Diff

| Token | Dark | Light | Note |
|---|---|---|---|
| `--diff-add-bg` | `#192F25` | `#E6F4EA` | primary text on it: 12.2:1 (dark) |
| `--diff-del-bg` | `#341F20` | `#FCE8E6` | 13.2:1 (dark) |
| `--diff-ai-tint` | `#23212D` | `#F1ECFC` | marks AI lines inside mixed hunks; 13.6:1 (dark) |
| `--diff-add-bar` / `--diff-del-bar` | `--success` / `--danger` | same | 3 px bars; the +/− sign is always shown too |

### 4.5 Type, space, shape, motion

| Group | Tokens |
|---|---|
| UI font | SF Pro Text (web fallback: `-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif`) |
| Code font | SF Mono (fallback: `ui-monospace, Menlo, "JetBrains Mono", monospace`); Jay can switch both |
| Type scale | 11 caption (status bar, badges) · 12 small (tree, tabs) · 13 body (macOS default) · 15 headline · 17 sheet title · 22 large title. Code 13 (setting 10–24), line height 1.5. UI line height 1.35 |
| Weights | 400 regular · 500 medium (labels) · 600 semibold (titles) |
| Spacing | 4-pt grid: 2, 4, 8, 12, 16, 20, 24, 32 |
| Radii | 4 controls and badges · 6 cards and inputs · 8 popovers · 12 sheets |
| Elevation | e1 cards: hairline border · e2 popovers: `0 8px 24px rgba(0,0,0,.45)` + 1 px border · e3 sheets: `0 20px 60px rgba(0,0,0,.55)` (light mode uses a third of the opacity) |
| Motion | fast 120 ms (hover, toggles) · base 180 ms (panels, popovers) · slow 260 ms (sheets) · easing `cubic-bezier(.2,.8,.2,1)` · presence pulse 1.6 s loop. Nothing animates on hot paths (typing, terminal output) |
| Layers | base 0 · sticky 10 · dock overlay 20 · popover 30 · sheet 40 · toast 50 · palette 60 |

## 5. Layout metrics

| Element | Size |
|---|---|
| Toolbar (unified, overlay title bar) | 52 px |
| Tool-window bars | 36 px wide; 28 px icon buttons |
| Tool-window header | 30 px |
| Editor tab bar / breadcrumbs | 32 px / 24 px |
| Status bar | 24 px |
| Gutter | line numbers + 6 px provenance lane + fold lane |
| Default panel sizes | left 260 (min 180) · right 340 (min 260) · bottom 220 (min 120) |
| Rows | tree 24 px, lists 28 px (Compact density: −2 px) |
| Pointer targets | ≥ 24 × 24 px |

## 6. Components

| Component | Anatomy | States | Accessibility |
|---|---|---|---|
| **ActorChip** | glyph · name · session hue dot · optional mode badge (In place / Worktree / Scratch) | idle, active (pulse), waiting (amber ring), done (✓), failed (✕) | label reads actor, session, and activity |
| **ProvenanceGutter** | 6 px lane left of line numbers using the §3 marks | default, hover (lane widens to 10 px), selected hunk | hover card: actor, session, turn, tool, time, confidence, "View diff"; keyboard: next/previous agent change |
| **PresenceCursor** | caret in session hue, flag with glyph and session name, 8% range highlight | live, idle (fades after TTL), waiting (hollow caret) | announced politely once per file ("Claude started editing session.ts") |
| **Author badges** (tabs, tree) | ◆ agent touched this session · ● you modified · ◆● both · ▲ external | with counts in the tooltip | included in the item's label |
| **StatusPill** (toolbar) | glyph stack + summary text ("◆ 2 working · 1 needs you") | color follows the most urgent state | button; opens the Mission Control popover |
| **AgentCard** | ActorChip, mode and trust badges, title, live step line, plan progress, stats (+/−, files, elapsed, usage), actions | Starting, Working, Needs you, Review ready, Done, Failed, Cancelled | card is a group; actions are buttons in tab order |
| **AttentionRow** | kind icon, one-line summary, ActorChip, age, primary and secondary actions | open, resolving, resolved | row actions have shortcuts shown in tooltips |
| **ApprovalPanel** | requester, command or action (monospace), working directory, the agent's reason, risk with reasons, matched rule, actions | low, medium, high risk (high requires a deliberate click or Touch ID) | never takes focus automatically; ⌘↩ allow once, ⌘⌫ deny |
| **QuestionCard** | question, option buttons, free-text answer, note that the agent keeps waiting | open, answered | text field labeled with the question |
| **HunkCard** | header (author chip, turn, tool, file, lines, confidence), diff body, actions | pending, accepted (collapsed, ✓), rejected (collapsed, struck), conflict (amber, "Resolve…") | J/K moves between hunks; A accept, X reject |
| **ModeToggle** | segmented control: AI only · Mine · Everything | — | radio group |
| **StartPointPicker** | session start, a turn, a tool call, last commit, last reviewed | — | menu |
| **Timeline** | per-session track: numbered turn markers, tool ticks (diamond = edit, square = shell, circle = read), scrubber, range selection | idle, scrubbing, range selected | ←/→ steps between ticks; the selection is announced |
| **Banner** | icon, sentence, one or two actions, dismiss | contested, tracking, degraded tracking, CLI missing | `role="status"` |
| **DelegateComposer** | prompt field, context chips, agent picker, space picker, trust picker, done-when, limit | empty, ready, submitting, error | ⌘↩ submits; chips removable with ⌫ |
| **ContextChip** | `@session.ts`, `@selection 18–29`, `@Problems (2)`, `@diff`, `@branch` | — | removable; label includes the chip type |
| **TrustPicker** | four options with one-line explanations; Autopilot notes "worktree only" | — | radio group with descriptions |
| **EmptyState** | icon, one sentence, one primary action | — | — |

## 7. Screens

### S1 Workspace (default)

See §2. Jay's own uncommitted lines show the solid blue bar; the agent's lines show the notched violet bar; a line Jay changed after the agent shows the split mark. The presence cursor sits where the agent is editing. A banner explains that Jay's saves will merge rather than overwrite. Terminal 2 shows the tracking banner.

### S2 Mission Control (Agents tool window, or maximized as an editor tab)

```text
┌ Mission Control ───────────────────────────────────────────────────────── [+ Delegate] [Filter ▾] ┐
│ NEEDS YOU · 2               WORKING · 1                      REVIEW READY · 1      DONE TODAY · 2 │
│ ┌─────────────────────────┐ ┌──────────────────────────────┐ ┌───────────────────┐                │
│ │◆ checkout-tests   WT    │ │◆ token-refresh   IN PLACE    │ │◆ rate-limit   WT  │                │
│ │wants to run             │ │Editing src/auth/session.ts   │ │5 files +20 −3     │                │
│ │ npm i -D msw@2          │ │plan 3/5 ▰▰▰▱▱                │ │test ✓ 48 passed   │                │
│ │medium · installs, net   │ │3 files +142 −31 · 6 min      │ │[Review]           │                │
│ │[Deny] [Allow once] [▾]  │ │[Console] [Interrupt]         │ └───────────────────┘                │
│ ├─────────────────────────┤ └──────────────────────────────┘                                      │
│ │◆ api-docs   WT          │                                                                       │
│ │asks: cover v1 as well?  │                                                                       │
│ │[Yes, briefly] [No]      │                                                                       │
│ └─────────────────────────┘                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Columns follow task state. Cards update live. The column order puts blocking items first.

### S3 Delegate (sheet from the toolbar, a context action, or Search Everywhere)

```text
┌ Delegate to an agent ──────────────────────────────────────────────────┐
│ What should the agent do?                                               │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Add a silent token refresh 60 s before expiry. Keep the public API  │ │
│ │ of session.ts unchanged.                                            │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ Context    [@session.ts ×] [@selection 18–29 ×] [@Problems (2) ×] [+]   │
│ Agent      [Claude CLI 2.1 ▾]                                           │
│ Where      ( ) In place   (•) Worktree, recommended   ( ) Terminal       │
│ Trust      [ Observe | Propose • | Pair | Autopilot ]                   │
│            Edits in its own worktree. Asks before installs or network.  │
│ Done when  [✓] run configuration "test" passes   [ ] custom command…    │
│ Limit      [✓] stop after 30 min                                        │
│                                              [Cancel]  [Delegate ⌘↩]    │
└─────────────────────────────────────────────────────────────────────────┘
```

Defaults: Worktree + Propose for headless work; Terminal + Pair when Jay wants to chat with the agent.

### S4 AI Changes (right tool window; can be maximized)

```text
┌ AI Changes ─────────────────────────────── ⋯ ┐
│ ◆ token-refresh (in place · Terminal 2) ▾     │
│ AI: 3 files · +142 −31 · 9 unreviewed         │
│ [ AI only • | Mine | Everything ]             │
│ Since: Session start ▾                        │
│ ①──◆◆──②──◆──③──◆◆■──④──◆   timeline          │
│ ▾ src/auth/session.ts   ◆●  +64 −12  ○ 4      │
│ ▾ src/auth/tokens.ts    ◆   +41 −19  ○ 3      │
│   tests/session.test.ts ◆   new +37  ○ 2      │
│   package-lock.json     generated, hidden     │
│ Your earlier changes (before this session) ▸ 2│
│ [Review all]  [Revert session…]  [Export ⋯]   │
└───────────────────────────────────────────────┘
```

Selecting a timeline tick filters to that step's diff. "Your earlier changes" is ARCHITECTURE §8A.2 layer 1, shown separately so Jay's own work never mixes with the agent's.

### S5 Review Inbox (editor tab)

```text
┌ Review: rate-limit (worktree) · 5 files · 7 hunks · 3 decided ──────────────── [Apply 3 accepted] ┐
│ Files                │ src/middleware/rateLimit.ts                              [Unified | Split] │
│ ◐ rateLimit.ts  1/2  │ ┌ ◆ Claude · rate-limit · turn 3 · Edit · L12–28 ──── [Accept ⌘↩] [Reject ⌫] │
│ ○ server.ts     0/2  │ │ 12 + const bucket = new TokenBucket({ rate: 20, burst: 40 })               │
│ ○ config.ts     0/1  │ │ 13 + export function rateLimit(req, res, next) {                            │
│ ✓ README.md     1/1  │ │ …                                                                          │
│ ! routes.ts  conflict│ └────────────────────────────────────────────────────────────────────────────│
│                      │ ┌ ◆ turn 4 · Edit · L40–44 · overlaps your uncommitted edit ───── [Resolve…]   │
└──────────────────────┴──────────────────────────────────────────────────────────────────────────────┘
```

Nothing is written to the main tree until **Apply**. Conflicts open the 3-way merge view.

### S6 Approval (popover from the Needs-you button; the same content appears in native notifications)

```text
┌ ◆ checkout-tests wants to run a command ─────────────────┐
│  npm install --save-dev msw@2                            │
│  in   worktrees/checkout-tests                           │
│  Why  "MSW mocks the payments gateway in the new tests." │
│  Risk ● Medium · installs packages · network access      │
│  Rule not in the Propose allowlist                       │
│                                                          │
│  [Deny]  [Allow once]  [Allow for this session ▾]        │
│  ▸ Always allow "npm install --save-dev *" here          │
└──────────────────────────────────────────────────────────┘
```

### S7 Question (agent asks Jay, H-07)

```text
┌ ◆ token-refresh asks ─────────────────────────────────────┐
│ When the refresh token itself has expired, should I log   │
│ the user out right away or retry once?                    │
│ [Log out]  [Retry once]  [Answer…]                        │
│ Your answer goes back to the agent. It is waiting.        │
└────────────────────────────────────────────────────────────┘
```

### S8 Agent Console (bottom tool window)

```text
┌ Agent Console · ◆ token-refresh ─────────────────────── [Interrupt] [⋯] ┐
│ You  Add a silent token refresh 60 s before expiry…                      │
│ ◆    I'll read session.ts and tokens.ts first.                           │
│   ▸ Read src/auth/session.ts (180 lines)                                 │
│   ▸ Read src/auth/tokens.ts                                              │
│ ◆ Plan  ✓ find expiry handling  ✓ add scheduler  ◻ tests  ◻ docs         │
│   ▾ Edit src/auth/session.ts  +18 −4                        [View diff]  │
│   ▸ Bash npm test -- session  (exit 0, 2.1 s)                            │
│ ◆    Tests pass. Adding a test for the retry path next.                  │
│ ──────────────────────────────────────────────────────────────────────── │
│ [Message the agent…]                                               [↩]   │
└──────────────────────────────────────────────────────────────────────────┘
```

Tool calls collapse by default. File edits link to their exact diff in AI Changes. The plan comes from the agent's todo events (H-09).

### S9 Search Everywhere (⇧⇧)

Tabs: All · Files · Symbols · Actions · Text · **Agents** (session history, FTS). Results are grouped, with the author glyph next to agent-history results. Actions include delegation templates: "Delegate: write tests for `refreshIfNeeded()`".

### S10 Terminal with tracking

Each terminal tab carries the glyph of the agent running in it. The tracking banner says how attribution works there ("hooks: certain" or "watching files: likely") and links to "Make tracking precise" (H-10 opt-in hook).

### S11 Settings → Agents and Trust

Sections: detected adapters with versions and status (verified, untested version, missing); default trust profile for headless and for interactive; remembered approval rules (scope, pattern, created, revoke); notifications per attention kind; "share my editor focus with agents" (off by default, per project); retention for AI history.

### S12 Learning

Lessons open as editor tabs: lesson text on the left, exercise project on the right, a tutor agent in the console running the Observe profile ("explains, hints, reviews; does not write the solution unless asked"). The exercise check result shows inline.

### S13 Welcome and first run

Steps: choose a project folder (creates the security-scoped bookmark), detect git and agent CLIs with install hints, pick a keymap, pick the default trust profile. Each step is skippable and revisitable from Settings.

## 8. Key flows

| Flow | Steps |
|---|---|
| **F1 Delegate and review** | ⌘⇧Y opens Delegate with the current selection as context → Worktree + Propose → Delegate. A card appears in Mission Control; the pill shows "1 working". When it finishes, a Review ready item enters the queue → open Review Inbox → J/K through hunks, A/X → Apply. A notification summarizes the result if Studio was in the background. |
| **F2 Pair in a terminal** | Jay types `claude` in a terminal → the tracking banner appears → the agent's edits show live in open editors with presence cursors and violet gutter marks → AI Changes counts climb → Jay reviews per turn on the timeline. |
| **F3 Approve a risky command** | The Needs-you badge increments with a soft pulse (no focus change) → Jay opens it when ready → the Approval panel shows command, reason, risk → "Allow for this session" stores a rule visible in Settings. |
| **F4 Answer a question** | The question card appears in the queue, and in the Agent Console if open → Jay clicks an option or types an answer → the agent continues; the card resolves. |
| **F5 Revert one agent hunk next to my edit** | In the editor, hover the violet gutter mark → "Revert this change" → a 3-way revert keeps Jay's adjacent lines → an undo toast offers the safety checkpoint. If the hunk overlaps Jay's edit, the conflict view opens instead. |
| **F6 Contested save** | The agent edits a file Jay has unsaved changes in → banner: "Claude changed this file 3 s ago. Saving will merge." → on save, a clean merge writes silently; a conflict opens the merge view. |
| **F7 Parallel agents** | Three tasks run in separate worktrees → Mission Control shows three cards with distinct session hues → each has its own AI Changes view with no cross-attribution. |
| **F8 Learn with a tutor** | Open a lesson → Start → Studio scaffolds the exercise in a worktree and attaches the tutor → "Check" runs the exercise's check command → pass or fail shows inline; Jay can ask the tutor for a hint. |

## 9. States and edge cases

| Situation | What Jay sees |
|---|---|
| No agents running | the pill hides; Mission Control shows an empty state: "No agents running. Delegate a task or run an agent CLI in a terminal." |
| Agent CLI not installed | Delegate disables that adapter with "Not found. Install hint…"; Settings shows the detection result |
| Untested CLI version | adapter chip shows "untested version"; attribution may fall back to Likely; one-time banner |
| Tracking degraded (hook unreachable, watcher overflow) | amber banner in the affected terminal and AI Changes: "Some changes in this period are marked likely." |
| Agent crashed | card moves to Failed with the last error; actions: View console, Retry, Discard worktree |
| Budget or time limit reached | card shows "Stopped at limit"; the work so far stays reviewable |
| Large diff (> 2,000 lines) | the inbox paginates by file; "Accept file" and "Reject file" come first |
| Binary or large file changed | hunk card says "Binary file changed" or "Large file changed (not restorable)" per CL-01 |
| Not a git project | AI Changes works the same; layer 1 is empty; worktree mode becomes scratch copy |
| Low-confidence attribution | `~` mark and "likely" in hover cards; nothing is hidden |
| Studio relaunched mid-session | sessions reappear with their state; terminals replay scrollback; nothing asks Jay to re-approve |

## 10. Keyboard

JetBrains-compatible by default (ARCHITECTURE §11.3). New bindings are **proposals**; T16's conflict checker settles them.

| Action | Key |
|---|---|
| Search Everywhere | ⇧⇧ |
| Find Action | ⌘⇧A |
| Delegate… | ⌘⇧Y (proposed) |
| Open Needs-you queue | ⌥⌘Y (proposed) |
| Next / previous agent change in the editor | ⌃⌥⇧↓ / ⌃⌥⇧↑ (proposed, mirrors IntelliJ "next change") |
| Mission Control | ⌘8 (proposed) |
| In Review Inbox: next / previous hunk | J / K |
| Accept / reject hunk | A / X |
| Accept / reject whole file | ⇧A / ⇧X |
| Apply accepted hunks | ⌘↩ |
| In an approval: allow once / deny / allow for session | ⌘↩ / ⌘⌫ / ⌥⌘↩ |
| Interrupt the focused agent | ⌘. |

## 11. Accessibility

- **Contrast:** §4 tokens meet WCAG 2.x AA (4.5:1 text, 3:1 controls and focus). Increase Contrast swaps hairlines to `--line-control` and tertiary text to secondary.
- **Never color alone:** actor shapes (§3), +/− signs in diffs, text labels on every status.
- **VoiceOver:** every glyph has a spoken label (§3); gutter marks expose "line 20, written by Claude, then edited by you". Agent state changes use a polite live region; nothing is assertive except an approval Jay explicitly opened.
- **Focus:** approvals, questions, and toasts never take focus. Focus order follows the visual layout; every tool window is reachable with its shortcut and Tab.
- **Motion:** with Reduce Motion, presence cursors don't pulse, panels appear without sliding, and the timeline scrubber jumps instead of easing.
- **Transparency:** with Reduce Transparency, vibrancy materials become solid `--surface-chrome` and `--surface-panel`.
- **Text size:** UI 11–17 pt via the font-size setting; code 10–24 pt; layouts reflow without clipping.

## 12. Writing for the UI

- Name agents by **session title** ("token-refresh"), with the CLI name where it matters ("Claude · token-refresh").
- Plain status verbs: "Editing session.ts", "Running npm test", "Waiting for your approval", "Ready for review".
- Say **"Needs you"**, not "Pending". Say **"Agent"**, not "AI says".
- Numbers carry meaning: "3 files · +142 −31 · 9 unreviewed".
- Notification examples: "Claude changed 3 files (+142 −31). Open AI Changes." · "checkout-tests wants to run npm install. Review." · "rate-limit is ready for review: tests passed."
- Errors say what happened and what to do: "Claude CLI wasn't found on PATH. Install it or set its path in Settings → Agents."

## 13. Implementation handoff

| Screen or component | Owner task (BUILD_WORKFLOW) |
|---|---|
| Tokens, theming, component conventions | T10 (`app/ui/src/theme/tokens.css`, `tokens.ts`) |
| Shell: toolbar, tool-window bars, docking, status bar | T11 |
| Project tree + author badges | T13, T37 |
| Editor, provenance gutter, contested banner | T14, T37 |
| AI Changes, timeline | T36 |
| Review Inbox | T38 |
| Agent Console, history, context actions | T39 |
| Mission Control, Needs-you queue, approval and question cards, presence cursors, toolbar pill | T45 (if H-deltas are accepted; otherwise a reduced pill in T39) |
| Settings → Agents and Trust | T18 (shell), T46 (trust and rules) |
| Accessibility audit | T62 |
| Learning views | T72, T73 |

**Visual tests:** Playwright renders each screen state against the mock core with fixtures named after this document (`S1-workspace`, `S2-mission-control`, …) and compares screenshots in dark, light, and increased contrast.
