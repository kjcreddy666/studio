# Studio: Architecture Specification

A personal, macOS-first developer studio. One app that combines a code editor, real terminals, agentic-CLI orchestration, a build section, and a learning section. It looks and behaves like a JetBrains IDE (IntelliJ layout and workflow) but feels like Apple built it for macOS.

Single user (the author). No cloud. No API-billed AI: all AI work goes through locally installed agentic CLIs (Claude CLI and others) running under the user's own login.

---

## 1. Goals and non-goals

**Goals**
- Low idle memory and high throughput (many terminals, file watchers, and agent streams at once).
- Fully local. No telemetry, no network dependency for core features.
- Language-agnostic: any language, any toolchain, any agentic CLI.
- IntelliJ-style information architecture; Apple-quality look, feel, and OS integration.
- Layered design: every layer is usable and testable without the layers above it.

**Non-goals**
- Windows/Linux support (kept possible by the architecture, not built).
- Multi-user, sync, collaboration, or hosted services.
- Re-implementing language intelligence (use LSP servers).

---

## 2. Guiding principles

1. **Core is a headless Rust library.** The UI is a client of the core. Core never imports UI code.
2. **Sessions live in the core, not the UI.** Closing a window or reloading the UI never kills a terminal or a running agent.
3. **Everything crosses one typed boundary.** UI and core talk through a single versioned command/event protocol (section 7).
4. **Binary for hot paths, JSON for control.** Terminal and agent output stream as binary chunks; commands and metadata are JSON.
5. **Backpressure everywhere.** Output is batched (8 to 16 ms flush) and bounded; a noisy process must never freeze the UI.
6. **Agents are untrusted by default.** File writes by agents land in a worktree or review inbox before they touch the main tree.
7. **Plugins are processes.** Extensions speak JSON-RPC over stdio and can be written in any language.
8. **Reuse before building.** If a free, offline, permissively licensed component already does the job, use it. Only the glue and the genuinely unique parts are written here (section 2.2 and Appendix A).
9. **Priorities decide trade-offs.** Every goal and feature carries a priority (P0 to P3). When time or complexity forces a compromise, the priority says what may be cut and what may never be (section 2.1 and Appendix B).
10. **Always know who changed what.** Every change to a project file is attributed to the human, an AI agent session, or an external source, and the user can view AI changes separately from their own at any time (section 8A).

### 2.1 Priority scale

| Level | Meaning | Compromise rule |
|---|---|---|
| **P0 Must** | The product is broken, unsafe, or pointless without it. | Never cut and never weakened. If blocked, stop and ask the author. |
| **P1 Should** | Expected in v1. | May ship reduced (fewer options, less polish, performance within the stated tolerance), but the capability must exist. |
| **P2 Could** | Valuable but not required for v1. | Cut or defer freely when time or complexity is at risk. |
| **P3 Later** | Not in v1. | Do not build. Keep an extension point only if it costs almost nothing. |

When two goals conflict, the higher priority wins. Within the same level, the earlier row in the table wins.

**Goal priorities**

| ID | Goal | Priority | What may be compromised |
|---|---|---|---|
| G1 | Fully local: no telemetry, no listening network port, no required network access | P0 | Nothing |
| G2 | Safety: approved roots, agent worktree isolation, review inbox, Keychain for secrets | P0 | Nothing |
| G3 | Sessions (terminals, agents) live in the core and survive UI reloads | P0 | Nothing |
| G4 | Reuse-first, license-clean dependencies | P0 | Nothing (a justified exception must be logged) |
| G5 | Language-agnostic via LSP, spawned CLIs, and adapters | P0 | Nothing |
| G6 | Build section (editor, terminal, git, run, problems) | P0 | Advanced features (see Appendix A) |
| G7 | Throughput: batching and backpressure design | P0 | The design is fixed; the numeric targets are P1 |
| G8 | Agent layer with review inbox | P0 | Number of supported CLIs beyond Claude CLI |
| G16 | Change attribution: the user can always see exactly what an AI session changed, separate from their own edits (Change Ledger, section 8A) | P0 | Nothing in correctness; UI polish and secondary views are P1 |
| G9 | JetBrains-style layout and interaction model | P1 | Rarely used IntelliJ features |
| G10 | Learning section | P1 | Content volume, progress analytics |
| G11 | Low memory footprint | P1 | Budgets may loosen up to 2x before a redesign is required |
| G12 | Apple-quality look and feel | P1 | Pixel-level fidelity, animation polish |
| G13 | Basic macOS integration (native window and menus, notifications, bookmarks, Keychain) | P1 (Keychain and bookmarks are P0) | Notification actions |
| G14 | Deep macOS integration (Spotlight, App Intents, Services, Touch ID, Handoff, etc.) | P2 | Everything here can be deferred |
| G15 | Plugin system | P2 | Can be deferred entirely |

### 2.2 Reuse-first policy (do not reinvent the wheel)

**Decision procedure for every feature, in this order:**
1. **Does macOS already provide it?** Use the OS framework (notifications, Keychain, Quick Look, Spotlight, bookmarks, FSEvents).
2. **Is there a free, offline library/component that does it?** Use it.
3. **Is there an existing CLI/server we can spawn?** Wrap it (git, ripgrep, LSP servers, debug adapters, formatters, agentic CLIs).
4. **Only then build it**, and only the part that no existing component covers. Record why in `docs/reuse-register.md`.

**Adoption criteria (all must hold):**
- Free to use, with no account, no subscription, and no required network calls at runtime (a one-time download at install is fine; the feature must work offline afterward).
- License compatible with a personal app that may be redistributed later: prefer MIT, Apache-2.0, BSD, ISC, MPL-2.0. Avoid linking GPL/AGPL code; spawning a GPL tool as a separate process is acceptable but must be noted.
- Actively maintained (recent releases, open issue activity) and builds on Apple Silicon (arm64).
- No telemetry, and small enough not to threaten the memory budget.
- Version pinned; license checked in CI (cargo-deny for Rust, a license checker for npm).

**Never hand-write any of these:** terminal emulator, text-editor engine, syntax highlighter, language analysis, git implementation, fuzzy matcher, diff algorithm, markdown parser, JSON-RPC layer, file watcher, SQLite wrapper, spaced-repetition scheduler, windowing/docking framework, accessible UI primitives, ripgrep-style text search.

**The parts we do build (this is the product):** the protocol and core orchestration, the agent adapter framework and parsers, the review inbox workflow, the policy and audit layer, run configurations and problem normalization, the learning engine glue (paths, exercises, tutor mode), IntelliJ-style tool-window semantics, the Search Everywhere providers, and the thin Swift/objc2 wrappers for macOS APIs that have no existing library.

**Verification rule:** library names in Appendix A are suggestions based on knowledge up to mid-2026. Before adopting, confirm the project still exists, its license, its maintenance status, and its current API. If a better free offline option exists, use it and update the register.

---

## 3. System overview

```
+--------------------------------------------------------------+
|                        macOS Host (Tauri 2)                  |
|  native window chrome, menus, vibrancy, notifications, etc.  |
|  +--------------------------------------------------------+  |
|  |  UI (webview): Svelte 5 + TypeScript                   |  |
|  |  editor (CodeMirror 6) | terminal (xterm.js + WebGL)   |  |
|  |  tool windows | agent panel | learning | settings      |  |
|  +---------------------------+----------------------------+  |
|                              | typed protocol (cmd/event/    |
|                              | binary channels)              |
|  +---------------------------v----------------------------+  |
|  |  studio-core (Rust, Tokio)                             |  |
|  |  pty | fs/watch | git | search | lsp | agents | tasks  |  |
|  |  learning | store (SQLite) | plugins | secrets | policy |  |
|  +-----+-----------+-----------+-----------+--------------+  |
+--------|-----------|-----------|-----------|-----------------+
         v           v           v           v
      shells     git / rg    LSP servers   agentic CLIs
      (PTY)      (spawned)   (stdio)       (Claude CLI, ...)
                                           plugins (JSON-RPC)
```

---

## 4. Technology stack

| Concern | Choice |
|---|---|
| Host / shell | Tauri 2 (system WKWebView, no embedded Chromium, no open localhost port) |
| Core | Rust, Tokio |
| macOS native bridge | `objc2` crates and a Swift package linked into the Tauri app for APIs without good Rust bindings |
| Front-end | Svelte 5 + TypeScript + Vite |
| Editor | CodeMirror 6 (with `@codemirror/merge` for diffs) |
| Terminal | xterm.js with WebGL renderer; PTY via `portable-pty` |
| Storage | SQLite via `rusqlite`, WAL mode, FTS5 for search |
| Language intelligence | LSP clients (`tower-lsp` types) talking to external servers; tree-sitter for syntax and structure |
| File watching | FSEvents via the `notify` crate |
| Git | `git` CLI for writes and worktrees; `gix` for fast reads (status, log) |
| Text search | ripgrep (spawned) |
| Spaced repetition | `fsrs-rs` |
| Secrets | macOS Keychain |
| Plugins | JSON-RPC 2.0 over stdio, separate processes |

**Host decision note.** Tauri keeps the editor/terminal ecosystem (CodeMirror, xterm.js) and low memory. The cost is that the UI is web-rendered, so Apple fidelity comes from (a) native window chrome and menus owned by the host, (b) a design-token layer matching Apple HIG, and (c) native modules for OS integration. Because `studio-core` is headless, the host can later be replaced by a native AppKit/SwiftUI shell without rewriting any core logic. Keep that boundary clean.

---

## 5. Repository layout

```
studio/
  crates/
    studio-core/         # orchestrator; wires services together
    studio-protocol/     # command/event types, shared with TS via codegen
    studio-pty/          # terminal sessions
    studio-fs/           # file ops, watching, bookmarks, path policy
    studio-git/          # git service, worktrees
    studio-search/       # ripgrep + FTS5 indexing
    studio-lsp/          # LSP client manager
    studio-agents/       # adapters, sessions, task queue, review inbox
    studio-build/        # run configs, task runners, problems
    studio-learn/        # paths, lessons, exercises, flashcards
    studio-store/        # SQLite schema + migrations
    studio-plugins/      # plugin host (JSON-RPC)
    studio-policy/       # permissions, approval rules, audit log
  macos/
    StudioNative/        # Swift package: native integrations (section 11)
  app/
    src-tauri/           # Tauri host, thin glue only
    ui/                  # Svelte front-end
  plugins/examples/
  docs/
```

TypeScript types for the protocol are **generated** from `studio-protocol` (e.g. `ts-rs` or `specta`). Never hand-write them.

---

## 6. Core services

### 6.1 Terminal service (`studio-pty`)
- Create, resize, write to, and kill PTY sessions; sessions are identified by ID and owned by the core.
- Scrollback ring buffer kept in the core (configurable, default 50k lines) so a reconnecting UI can replay.
- Output delivered over a binary channel, batched at 8 to 16 ms, with a per-session high-water mark and pause/resume flow control.
- Shell integration: inject prompt markers (OSC 133) to detect command start/end, exit codes, and working directory. This powers "run again", per-command output folding, and notifications on long commands finishing.
- Profiles: shell, env vars, cwd, startup command (for example "open Claude CLI in this project").

### 6.2 File service (`studio-fs`)
- Operations scoped to **approved roots** only (security-scoped bookmarks on macOS, section 11).
- Tree listing, read, atomic write (write temp + rename), move, delete to Trash (never hard-delete by default), and watch via FSEvents with debounce.
- Respect `.gitignore` and a global ignore list when indexing.

### 6.3 Git service (`studio-git`)
- Reads via `gix`: status, log, blame, branch list, diff.
- Writes via the `git` CLI: stage, unstage, commit, branch, merge, rebase, stash, worktree add/remove.
- Worktree manager: one worktree per agent task, created and cleaned up automatically.

### 6.4 Search service (`studio-search`)
- Search Everywhere backend: files (fuzzy), symbols (from LSP/tree-sitter), actions, recent items, agent history, notes.
- Text search through ripgrep with streaming results.
- SQLite FTS5 index for notes, agent transcripts, lessons.

### 6.5 Language service (`studio-lsp`)
- Spawn and manage LSP servers per language and per project (configured via a registry: command, args, root markers).
- Features surfaced: diagnostics, completion, hover, go to definition, find usages, rename, code actions, formatting, document symbols, workspace symbols.
- tree-sitter for fast highlighting, folding, structure view, and "select enclosing block".

### 6.6 Build service (`studio-build`)
- **Run configurations** (IntelliJ concept): named, typed (shell command, npm script, cargo, make, custom), with env, cwd, before-launch steps.
- Run/debug/stop, per-config output tool window, rerun last, rerun failed.
- Problem matchers parse compiler/test output into a unified Problems list (file, line, severity, message) that links into the editor.
- Dev-server manager with port detection and a live preview pane.
- Project scaffolding from templates.

### 6.7 Policy service (`studio-policy`)
- Central permission checks for file access, process spawn, and agent actions.
- Append-only audit log of agent actions (section 12).

---

## 7. Protocol between UI and core

One versioned protocol, defined in `studio-protocol`.

- **Commands** (UI to core): request/response, JSON. Example: `fs.read`, `pty.create`, `git.commit`, `agent.start`.
- **Events** (core to UI): pub/sub, JSON. Example: `fs.changed`, `agent.event`, `problems.updated`.
- **Binary channels** (core to UI, high volume): one channel per PTY session and per agent stream. Frame = `[session_id u32][seq u32][payload bytes]`.
- Every command has a typed error enum; no stringly-typed errors.
- The protocol carries a `protocol_version`; the UI refuses to start against an incompatible core.
- All handlers are async and cancellable. Long operations return a handle and report progress via events.

---

## 8. Agent layer (`studio-agents`)

This is the highest-value layer. It wraps agentic CLIs that run under the user's own login (no API billing).

### 8.1 Adapters
Each CLI is defined by an adapter, mostly declarative config:

```toml
[adapter.claude]
display_name = "Claude CLI"
interactive_cmd = ["claude"]
headless_cmd    = ["claude", "-p", "{prompt}", "--output-format", "stream-json"]
resume_flag     = "--resume {session_id}"
event_parser    = "claude-stream-json"   # built-in parser id, or a plugin
supports        = ["resume", "structured_events", "tool_approval"]
```

- Verify exact flags against the installed CLI's `--help` at build time; do not assume.
- Parsers are pluggable. Unknown CLIs can fall back to "raw terminal mode" (just a PTY) with no structured events.

### 8.2 Two modes
- **Interactive:** the real CLI inside a terminal tab (full fidelity, user types).
- **Headless:** the core runs the CLI with structured output and converts it into normalized events: `message`, `tool_call`, `tool_result`, `file_edit`, `status`, `cost/usage` (if reported), `done`, `error`.

### 8.3 Task model
- A **Task** = prompt + adapter + project + isolation mode + status.
- Isolation modes: `in_place`, `worktree` (default for headless), `scratch_copy`.
- Task queue with concurrency limit; parallel tasks each in their own worktree.
- Resume a prior session; fork a session; cancel at any time (SIGINT then SIGKILL after grace period).

### 8.4 Review inbox
- When a worktree task finishes, the diff against its base is placed in the inbox.
- UI: per-file and per-hunk accept/reject (CodeMirror merge view). Accepted hunks are applied to the main working tree via git; rejected hunks are discarded.
- Nothing from an agent reaches the main tree without passing the inbox unless the user explicitly enables `in_place` for that task.

### 8.5 Instructions and prompts
- Manage per-project instruction files (e.g. `CLAUDE.md`) from the UI with a structured editor and templates.
- Prompt library: reusable prompts with variables (`{file}`, `{selection}`, `{error}`, `{branch}`).
- Context actions anywhere in the studio: "Explain this", "Fix this error", "Write tests for this", "Review this diff" send the relevant context to the chosen adapter.

### 8.6 History
- Every session and event stream is stored in SQLite (FTS5) so past work is searchable ("what did the agent change in auth last week and why").

---

## 8A. Change Ledger: AI vs human change tracking (core feature, P0)

### 8A.1 The problem this solves
The user often has uncommitted edits of their own, then starts an agentic CLI (e.g. Claude CLI), which edits the same working tree. `git diff` then mixes both, and the user cannot tell which changes came from the AI and which are theirs. The studio must make this unambiguous at all times: **what did the AI change in this session, and nothing else.**

This feature works for every mode: interactive CLI in a terminal tab, headless tasks, and in-place or worktree isolation. It does not depend on the user's git state (clean, dirty, or not a git repo at all).

### 8A.2 Core idea: a three-layer view of the working tree

```
HEAD (last commit)
  |   Layer 1: "Your changes before the session"   = diff(HEAD -> session baseline)
  v
Session baseline  (snapshot of the full working tree, including uncommitted and untracked files, taken at the moment the agent session starts)
  |   Layer 2: "Changes during the session"        = diff(baseline -> now), each hunk tagged AI / You / External
  v
Now (current working tree)
```

- The **AI Changes** view shows Layer 2 filtered to AI-attributed lines: exactly what the agent changed, against the state it started from, even if the user's own uncommitted edits sit in the same file.
- Layer 1 is shown separately as "Your earlier changes", so the user's own work is never confused with the AI's.
- The **All changes** view shows HEAD to now, with every hunk marked by origin.

### 8A.3 Snapshots without touching the user's repo
- Snapshots are stored in a **shadow git repository** in the app's data directory (`~/Library/Application Support/Studio/shadow/<project-id>.git`), pointed at the project as its work-tree. The user's own `.git`, index, branches, stash, and hooks are never modified. Non-git projects work identically.
- A snapshot is a git **tree object** of the entire working tree (tracked and untracked, honoring `.gitignore` plus a studio ignore list), built with a temporary index so the user's index is untouched.
- Snapshots are **incremental**: FSEvents (via `notify`) marks dirty paths; only those paths are re-added to the shadow index, then `write-tree`. Unchanged blobs are deduplicated by git, so cost stays proportional to changes, not repo size.
- Large and noisy paths (`node_modules`, `target`, build outputs, `.git`) are excluded by default. Files above a size limit and binaries are tracked by hash only (shown as "binary file changed", restorable, not line-diffed).
- Retention: configurable (default 30 days or N sessions); old snapshots are garbage-collected with `git gc` on the shadow repo.

### 8A.4 Checkpoints and who made them
A **checkpoint** is a snapshot tagged with an actor and a cause, stored in SQLite and pointing at a tree object. Checkpoints are created at these moments:

| Moment | Actor tag | Confidence |
|---|---|---|
| Agent session starts (the baseline) | Baseline | n/a |
| Immediately **before** an agent tool call (edit, write, shell command) | Pre-call marker | n/a |
| Immediately **after** that tool call completes | AI (session, turn, tool, file paths) | Certain |
| User saves in the studio editor, or renames/deletes/moves in the file tree | You | Certain |
| Studio runs a formatter, git operation, or scaffolding step | Studio (git/formatter/etc.), not AI | Certain |
| Changes detected with no matching event (other editor, Finder, other tools) | External | Likely |

**Key trick:** because a checkpoint is taken immediately before and after every agent tool call, `diff(pre, post)` is the AI's change for that call, and anything that changed between `post(n)` and `pre(n+1)` belongs to the human or an external source. Interleaved human and AI edits therefore separate cleanly.

**How tool-call boundaries are known (in order of preference):**
1. **Structured events:** headless/stream-JSON output from the agent CLI (tool name, target file, start/end).
2. **CLI hooks:** for CLIs that support lifecycle hooks (Claude CLI supports pre/post tool-use hooks; verify against the installed version), the studio injects hook configuration pointing to a small local helper that notifies the core over a Unix domain socket. For sessions launched from the studio, this is automatic and invisible; the user's own CLI config files are not rewritten (use a per-session settings override or environment variable where the CLI allows).
3. **Process detection:** if the user starts the CLI manually in a terminal tab, the core detects the foreground process of the PTY (e.g. `claude`) and opens a tracking session automatically ("Tracking Claude CLI in Terminal 2"). Without hooks or events, attribution falls back to heuristics (below) and is labeled lower confidence.
4. **Manual:** a "Start tracking / Mark baseline now" action, for any tool.

**Heuristic fallback (no events or hooks):** while an agent process is running and the studio itself has not written the file, changes are attributed to the AI with confidence **Likely**; changes made through the studio editor are always attributed to the user. The UI shows the confidence level on any hunk that is not Certain.

**Shell tool calls:** a shell command (e.g. `npm install`, a code generator, a formatter) can change many files. Everything changed during that call is attributed to the AI with the command recorded ("changed by `npm install`"); lockfile/generated files are labeled as such and can be hidden by default.

### 8A.5 Line-level provenance
For every changed file the ledger keeps **per-line provenance**, like `git blame` but with actors and sessions:
- On each checkpoint, diff the previous and new version of the file (patience/Myers diff via the `similar` crate or `git diff`); lines that survive keep their original origin; inserted or modified lines get the checkpoint's actor; removed lines are recorded as tombstones with the actor that removed them.
- If the user edits a line the AI wrote, the line becomes **"AI, then edited by you"** (both origins kept, current origin = You). If the AI edits a line the user wrote earlier in the session, the reverse applies.
- Result: the AI Changes view can show, for any file, exactly which hunks and lines are AI-authored since a chosen starting point, even in files both parties edited.
- Edge cases handled explicitly: new files, deleted files, renames and moves (detected by hash similarity), file mode changes, binary files, CRLF/LF-only changes, and whitespace-only changes (togglable).

### 8A.6 User-facing capabilities
- **AI Changes tool window:** lists sessions and, per session, the files the AI changed with +/- counts; a toggle switches among: *AI only*, *Mine only*, *Everything*. Header shows a running summary ("AI: 7 files, +142 / -31 this session").
- **Choose the starting point:** since session start (default), since a specific turn or tool call, since last commit (HEAD), or since "last reviewed".
- **Timeline:** one entry per agent turn and tool call (with the prompt, tool, files touched); select one to see only that step's diff; scrub forward and backward.
- **Editor integration:** gutter markers on each changed line, distinguishing AI, You, AI-then-You, and External using different colors **and** shapes/patterns (not color alone). Hover shows session, turn, tool, time, and confidence. Click to open the diff for that hunk.
- **File tree and tabs:** badges for files touched by the AI in the current session (and a separate marker for files changed by both).
- **Diff views:** side-by-side and unified (via CodeMirror merge), always against the chosen starting point, with "AI only" filtering hunks by provenance.
- **Review state:** mark hunks/files as reviewed; unreviewed AI changes are counted in the status bar and Dock badge.
- **Selective revert (AI-only undo):** revert a hunk, a file, a turn, or the whole session by applying the reverse of the **AI-attributed hunks only**, via a three-way merge so the user's own edits are preserved. If an AI hunk overlaps a user edit, show a conflict view instead of overwriting anything.
- **Restore point:** restore any file (or the whole tree) to a checkpoint, preceded automatically by a new safety checkpoint so the restore itself is undoable.
- **Commit integration:** the commit tool window can stage or filter by origin ("stage only AI changes", "stage only mine"), and optionally adds a commit trailer such as `AI-Assisted: <cli> <session-id>` (off by default, user-controlled).
- **Export:** copy or export the AI's changes for a session as a unified patch.
- **Notifications:** when an agent session or task ends, a native notification summarizes "Claude changed 7 files (+142 / -31)" with an "Open AI Changes" action.
- **Concurrency awareness:** when the agent has touched a file within the last few seconds, the editor shows a banner; if the user saves while the agent is writing the same file, the ledger flags the file as **contested** and the editor offers a merge instead of silently overwriting.

### 8A.7 Acceptance scenarios (must pass)
1. The user has uncommitted edits in `a.ts` and `b.ts`, then starts Claude CLI, which edits `a.ts` and `c.ts`. AI Changes shows only Claude's hunks in `a.ts` and `c.ts`; "Your earlier changes" shows the user's edits to `a.ts` and `b.ts`; none of the user's edits appear under AI.
2. While Claude is running, the user types in `a.ts` in the studio editor and saves. Those lines are attributed to the user.
3. The user edits a line Claude just wrote. It shows as "AI, then edited by you".
4. Claude runs `npm install`. The lockfile change is attributed to the AI, labeled with the command, and hidden by default under "generated".
5. Reverting one AI hunk next to a user edit succeeds without touching the user edit; reverting an overlapping hunk opens a conflict view.
6. Closing and reopening the studio window mid-session loses nothing; the ledger lives in the core.
7. Claude creates, deletes, and renames files; all appear in AI Changes and are restorable.
8. The project is not a git repository; everything above still works.
9. The user starts `claude` manually in a plain terminal tab; tracking begins automatically and attribution is correct (Certain with hooks, Likely without).
10. Two agent sessions run in parallel in different worktrees; each has its own ledger view with no cross-attribution.

### 8A.8 Relationship to other features
- The **review inbox** (section 8.4) is built on the Change Ledger: for worktree tasks, the inbox shows the ledger's AI hunks; for in-place sessions, the AI Changes window is the review surface. There is one attribution engine, not two.
- The **audit log** (section 12) stores the agent-initiated command and file-change events; the ledger stores the content-level history.

### 8A.9 Priorities within this feature
- **P0:** baseline snapshots, shadow repo, checkpoints around tool calls, actor attribution with confidence, three-layer view, AI-only diff, line provenance, selective revert, persistence in the core, all acceptance scenarios 1 to 8.
- **P1:** timeline scrubbing, editor gutter and file-tree markers, review state, commit-by-origin staging, native notifications, process auto-detection for manually started CLIs (scenario 9), contested-file handling, parallel sessions view (scenario 10).
- **P2:** commit trailer, patch export, rename detection beyond simple hash similarity, per-line "AI then you" history popovers.
- **Performance targets (P1 tolerance):** checkpoint creation under 100 ms for typical edits on a 100k-file repo (incremental), AI Changes view opens under 300 ms, no perceptible editor lag from the watcher.

---

## 9. Build section

Everything an IntelliJ user expects, built from the core services above:

- **Project view** (file tree), **Structure** (symbols), **Problems**, **Run**, **Terminal**, **Git**, **Search Results**, **TODO** tool windows.
- Editor: tabs, splits, breadcrumbs, folding, multi-cursor, code actions (Option+Return equivalent), inline diagnostics, inlay hints, minimap off by default, local history (file snapshots kept by the core).
- Git UI: commit tool window with hunk staging, log graph, branch switcher, blame gutter, diff viewer, worktree list.
- Test runner integration: parse results into a tree (suite, test, status), rerun failed.
- Live preview pane for web projects.

---

## 10. Learning section (`studio-learn`)

- **Learning paths:** ordered topics defined in markdown + frontmatter files in a user-owned folder (portable, version-controllable).
- **Lessons:** markdown content with embedded runnable snippets and exercises.
- **Learn by building:** starting a lesson scaffolds a real project in a worktree and optionally attaches a **tutor agent** (adapter + a tutor instruction file). Tutor mode rules: explain, hint, and review the user's code; do not write the solution unless asked.
- **Exercises:** each has a check command (run through the build service). Pass/fail and attempts are recorded.
- **Flashcards:** generated from the user's own notes/lessons, scheduled with FSRS; review UI with keyboard-first flow.
- **Progress:** per-path and per-topic completion, streaks, time spent (local only).
- **Explain anywhere:** "Explain this code/error" from the editor, terminal, or Problems list routes through the agent layer in tutor mode.

---

## 11. macOS integration (first-class requirement)

Target the **latest macOS SDK (macOS 27)**. The list below reflects APIs known through macOS 26; **at build time the implementing agent must read Apple's macOS 27 release notes and HIG updates and adopt any new relevant APIs**, replacing or extending items here. Use availability checks with graceful fallback to the previous OS version.

### 11.1 Look and feel (Apple design language)
- Follow the current Apple design language (Liquid Glass materials as of macOS 26): translucent, layered chrome with the content area kept calm and opaque.
- Native window with a **unified toolbar**, full-size content, and a hidden/overlay title bar; traffic-light controls positioned natively. Sidebar and inspector regions use `NSVisualEffectView` materials (vibrancy), not CSS imitations, wherever the host allows.
- Typography: **SF Pro** for UI, **SF Mono** for code/terminal (user-switchable). Icons: **SF Symbols** (export as SVG for the web layer, or render natively). Respect Dynamic Type-like scaling via a user font-size setting.
- Automatic light/dark following the system; honor Accent Color and "Reduce Transparency", "Reduce Motion", and "Increase Contrast" accessibility settings.
- Motion: spring-based, short, interruptible. No decorative animation on hot paths.
- Native controls where possible: context menus, popovers, sheets, alerts, segmented controls, and the standard text-editing behaviors (emacs-style key bindings in text fields, spell check, text replacement toggles).

### 11.2 System integration
- **Native menu bar** with full menus (File/Edit/View/Navigate/Code/Refactor/Run/Tools/Git/Window/Help), standard macOS shortcuts, and a **Help menu search**. All commands registered once and exposed in menus, command palette, and Search Everywhere.
- **Window management:** native full screen, Split View, Stage Manager, and system window tiling; multiple windows per project with state restoration (`NSWindow` restoration).
- **Spotlight:** index projects, notes, lessons via CoreSpotlight; open a file or lesson from system search.
- **App Intents and Shortcuts:** expose actions ("Open project", "Run configuration", "Start agent task with prompt", "Review inbox count") to Shortcuts, Siri, and Spotlight actions.
- **Services menu and Share extension:** send selected text/files from other apps into the studio ("Ask agent about this", "Add to notes").
- **Notifications (UserNotifications):** long command finished, agent task done or needs approval, tests failed. Actionable notifications (Approve / Open diff).
- **Menu bar extra:** compact status of running agents/tasks with quick actions.
- **Dock:** badge for pending reviews, Dock menu with recent projects, progress on the Dock icon during builds.
- **Quick Look and drag/drop:** Spacebar preview for files in the project tree; drag files to/from Finder, Mail, and the terminal (inserts escaped paths).
- **Touch ID / LocalAuthentication:** gate high-risk agent approvals and secret reveal.
- **Keychain:** all secrets and tokens stored here, never in plain files or SQLite.
- **Security-scoped bookmarks:** persist access to approved project folders across launches without broad Full Disk Access.
- **Open With / URL scheme / document types:** `studio://` scheme and "Open in Studio" from Finder; `studio` command-line launcher installed on request.
- **Handoff / NSUserActivity:** reserved for future multi-device use; implement the activity types now.
- **Focus filters:** optionally suppress agent notifications by Focus.
- **Launch at login** and background persistence via `SMAppService`; the core can keep agent tasks alive while the window is closed (app stays running in menu bar).
- **Power:** honor Low Power Mode (reduce indexing and watcher frequency) and prevent sleep during active builds/agent tasks via `ProcessInfo` activity assertions.
- **On-device intelligence (optional, off by default):** if Apple's on-device model API is available, use it only for tiny local helpers (commit message suggestion, summarizing a transcript). Primary AI remains the agentic CLIs.
- Sign and notarize with hardened runtime; declare only the entitlements actually used.

### 11.3 JetBrains-class interaction model on macOS
- **Search Everywhere** (double-Shift, plus Cmd+Shift+O style shortcuts) and **Find Action** (Cmd+Shift+A).
- JetBrains-compatible default keymap with a switchable "macOS native" keymap; fully remappable; conflicts shown in settings.
- Settings window in the native macOS style (toolbar tabs), opened with Cmd+,.

---

## 12. Security model

- **Local-only:** no listening TCP port. UI-core communication is in-process (Tauri IPC). Any local server a plugin needs binds to a Unix domain socket under the app's container with 0600 permissions.
- **Approved roots:** the core refuses file operations outside folders the user added (resolved through bookmarks; canonicalize paths to defeat `..` and symlink escapes).
- **Process spawn policy:** only configured commands and registered adapters/plugins; arguments are never built by string concatenation (always argv arrays).
- **Agent safety:** worktree isolation by default, review inbox, per-task allowed-tools configuration where the CLI supports it, an optional "approval required" mode that surfaces tool-approval prompts as native notifications/sheets.
- **Audit log:** append-only table of agent-initiated file changes and commands (who/what/when/task).
- **Plugin sandboxing:** plugins declare capabilities in a manifest; the host mediates fs/process access through the same policy service; run under a restricted environment (scrubbed env vars).
- **Untrusted content:** agent output, file contents, and web content are data, never instructions to the studio itself.
- **Secrets:** Keychain only; redact from logs and transcripts.
- **Updates and integrity:** signed builds; verify plugin checksums on install.

---

## 13. Data model (SQLite, `studio-store`)

Key tables (all with `id`, `created_at`, `updated_at`):

- `projects(path, bookmark, name, settings_json)`
- `run_configs(project_id, type, name, command, env_json, cwd, before_launch_json)`
- `terminal_profiles(name, shell, env_json, cwd, startup_cmd)`
- `agent_adapters(key, config_toml)`
- `agent_tasks(project_id, adapter, prompt, isolation, worktree_path, status, session_ref, started_at, finished_at)`
- `agent_events(task_id, seq, kind, payload_json)` + FTS5 virtual table over text payloads
- `review_items(task_id, file, hunks_json, state)`
- `agent_sessions(project_id, adapter, terminal_id, mode, baseline_checkpoint_id, started_at, ended_at, detection)` (detection: launched / auto-detected / manual)
- `checkpoints(project_id, session_id, seq, ts, actor, cause, turn, tool_call_id, tree_oid, parent_id, confidence)`
- `file_changes(checkpoint_id, path, change_type, old_oid, new_oid, old_path, tool_detail)`
- `line_provenance(project_id, path, version_oid, lines_blob)` (compact per-line origin map, rebuilt from checkpoints if lost)
- `hunk_review(session_id, path, hunk_hash, state, ts)`
- `audit_log(task_id, action, target, detail_json, ts)`
- `notes(project_id, title, body_md)` + FTS5
- `snippets(language, title, body)`
- `learn_paths`, `learn_topics`, `learn_attempts(exercise_id, passed, ts)`
- `cards(front, back, source_ref)`, `card_reviews(card_id, rating, due, stability, difficulty, ts)` (FSRS state)
- `prefs(key, value_json)`

Rules: WAL mode, migrations are forward-only and versioned, one writer task in the core, and a one-click export/import of the whole database plus the learning-content folder.

---

## 14. Plugin system

- A plugin is an executable plus `plugin.toml` manifest: id, version, capabilities, contributed commands, panels (webview URL served from the plugin's bundle), agent adapters/parsers, language-server registrations.
- Transport: JSON-RPC 2.0 over stdio. Host-to-plugin: lifecycle, command invocations, events. Plugin-to-host: limited API (read file within roots, register command, show notification, run task), all policy-checked.
- Crash isolation: a crashing plugin never takes down the core; restart with backoff.

---

## 15. Performance budgets (verify in CI where possible)

| Metric | Target |
|---|---|
| Cold start to interactive window | under 700 ms |
| Idle memory (app + core, one project open, no agents) | under 250 MB |
| Terminal throughput | sustain at least 50 MB/s of output without UI frame drops (flow control active) |
| Keystroke-to-render latency in editor/terminal | under 16 ms |
| File tree open on 100k-file repo | under 1 s (lazy, virtualized) |
| Search Everywhere first results | under 50 ms from keystroke |

Techniques: virtualized lists everywhere, lazy-load panels, binary channels for hot streams, indexing off the main runtime thread pool, WebGL terminal renderer, and avoiding JSON for per-chunk data.

---

## 16. UI structure (functional layout)

IntelliJ-style window anatomy, rendered with Apple design language (section 11.1):

- **Top:** unified toolbar: project/branch switcher, run-configuration selector with Run/Stop/Rerun, agent status pill, Search Everywhere button.
- **Left tool-window bar:** Project, Structure, Git, Learning, Agents (icon-only, SF Symbols).
- **Right tool-window bar:** AI Changes, Review Inbox, Notes/Snippets, Preview.
- **Bottom tool-window bar:** Terminal, Run, Problems, Agent Console, Search Results, TODO.
- **Center:** editor tab groups with splits; welcome and Learning views open here as tabs.
- **Status bar:** branch, LSP status, indexing progress, encoding/line ending, cursor position, running-task count, memory indicator (optional).
- **Navigation bar / breadcrumbs** under the toolbar.
- Tool windows dock, float, or hide with the standard IntelliJ gestures; layout is saved per project.
- Modes: Normal, Distraction-free, Presentation.

---

## 17. Build order (milestones)

1. **M0 Skeleton:** Tauri host, native window chrome and menu bar, protocol + codegen, SQLite store, settings.
2. **M1 Workspace:** approved roots/bookmarks, file tree, watcher, CodeMirror editor with tree-sitter highlighting, tabs/splits, Search Everywhere (files + actions).
3. **M2 Terminal:** PTY service, xterm.js WebGL, binary channels with flow control, scrollback, profiles, OSC 133 integration.
4. **M3 Agents:** first the **Change Ledger** (section 8A: shadow repo, baseline snapshots, checkpoints around tool calls, attribution, AI Changes view, selective revert), because the review inbox and everything else build on it; then adapter framework, Claude CLI adapter (interactive + headless, with hook/event integration), task queue, worktree isolation, event stream UI, review inbox, history with FTS.
5. **M4 Build:** git UI, run configurations, problem matchers, test tree, LSP manager, dev-server preview.
6. **M5 macOS depth:** Spotlight, App Intents, notifications with actions, menu bar extra, Dock integration, Services/Share, Touch ID approvals, state restoration, accessibility settings, macOS 27 API adoption pass.
7. **M6 Learning:** paths, lessons, exercises with checks, tutor mode, FSRS flashcards, progress.
8. **M7 Plugins and hardening:** plugin host, additional adapters, security review, performance pass against section 15, signing and notarization.

Milestone priorities: M0 to M4 deliver all P0 items (including the P0 macOS items: native window, menus, bookmarks, Keychain, which land in M0 to M3). M5 delivers P1 macOS depth first, then P2 items only if time allows. M6 is P1. M7 is P2 plus P0 hardening (license audit, security review).

Each milestone ends with: tests passing, performance budget checked for the layer, the reuse register updated, and a short demo script in `docs/`.

---

## 18. Instructions for the implementing AI

- Treat this document as the source of truth; if something is ambiguous, choose the simplest option that preserves the principles in section 2 and record the decision in `docs/decisions.md`.
- Build layer by layer in the order of section 17; do not start a layer before the one below passes its tests.
- **Verify, don't assume:** check actual CLI flags (`claude --help`, etc.), current crate APIs, Tauri 2 plugin APIs, and macOS 27 SDK availability from official docs before writing code that depends on them.
- Keep the Tauri host thin; all logic belongs in `studio-core` crates so the host can be swapped.
- Never add a network listener, telemetry, or auto-update network calls without an explicit flag set by the user.
- Follow the reuse-first procedure in section 2.2 for every feature. Before writing any component, check Appendix A; if it lists a reuse option, use it. Log every build-it-ourselves decision and every new dependency (name, version, license, reason) in `docs/reuse-register.md`.
- Respect priorities: never cut or weaken a P0 item; ask the author before compromising anything P0. Follow Appendix B when time is short.
- Write unit tests for core services and protocol round-trips; write integration tests for PTY, git worktrees, and the review inbox flow.
- Prefer native macOS controls and behaviors over web imitations whenever the host allows it.

---

## 19. Open decisions to confirm with the author

1. Minimum supported macOS version (recommendation: current and previous major).
2. Whether to stay on Tauri or move the host to a native AppKit/SwiftUI shell after M5 if web-rendered chrome falls short of the desired Apple feel.
3. Which agentic CLIs besides Claude CLI get first-party adapters.
4. Default keymap: JetBrains-compatible or macOS-native.

---

## Appendix A: Feature register (priority, reuse, what we build)

"Reuse" lists free, offline options to adopt (verify per section 2.2). "Build" is only the glue or unique logic. Priority follows section 2.1.

### Foundation

| ID | Feature | Pri | Reuse | Build |
|---|---|---|---|---|
| F01 | Typed UI-core protocol | P0 | Tauri IPC and channels, `serde`, `ts-rs` or `specta` for generated TS types | Command and event definitions |
| F02 | Storage, migrations, full-text search | P0 | `rusqlite` (SQLite with FTS5), `rusqlite_migration` or `refinery` | Schema |
| F03 | Approved roots, path policy | P0 | macOS security-scoped bookmarks (via `objc2`), standard path canonicalization | Policy checks |
| F04 | Audit log | P0 | SQLite | Table and writer |
| F05 | Settings and preferences | P1 | SQLite | Settings UI |
| F06 | Window and layout restoration | P1 | `tauri-plugin-window-state`, `NSWindow` restoration | Dock layout persistence |
| F07 | Backup and export of all data | P1 | SQLite backup API / `VACUUM INTO` | Export UI |

### Editor

| ID | Feature | Pri | Reuse | Build |
|---|---|---|---|---|
| E01 | Text editing engine, multi-cursor, find/replace, bracket matching | P0 | CodeMirror 6 | Theme, keymap, glue |
| E02 | Syntax highlighting, folding, structure | P0 | tree-sitter and grammars (CodeMirror language packages as fallback) | Glue |
| E03 | Diagnostics, completion, hover, go to definition | P0 | Existing LSP servers (rust-analyzer, typescript-language-server, pyright, gopls, clangd, sourcekit-lsp, ...), `lsp-types`, a CodeMirror LSP client package if mature | Server registry and lifecycle manager |
| E04 | Diff and merge view | P0 | `@codemirror/merge`, `similar` crate | Review logic |
| E05 | Find usages, rename, code actions, symbols | P1 | LSP | UI |
| E06 | Formatting | P1 | LSP formatting, external formatters (prettier, rustfmt, black, gofmt) | Per-language config |
| E07 | Local history | P2 | Shadow git repo or snapshots | UI |
| E08 | Debugger | P2 | Debug Adapter Protocol with existing adapters (lldb-dap, debugpy, delve, js-debug), existing DAP client library if mature | Debug UI |
| E09 | Refactorings beyond LSP | P3 | None | None |

### Terminal

| ID | Feature | Pri | Reuse | Build |
|---|---|---|---|---|
| T01 | Emulation and rendering | P0 | xterm.js with WebGL addon | Glue |
| T02 | PTY sessions | P0 | `portable-pty` | Session manager owned by the core |
| T03 | Flow control and backpressure | P0 | xterm.js write-callback pattern | Batching and high-water marks |
| T04 | Shell integration (command boundaries, exit codes, cwd) | P1 | Standard OSC 133 protocol and existing open-source shell integration scripts (as used by VS Code, WezTerm, kitty), license checked | Injection and parsing |
| T05 | Scrollback replay for reconnecting UI | P1 | None | Ring buffer |
| T06 | Profiles | P1 | None | Config and UI |
| T07 | Search in terminal, clickable links | P2 | xterm.js search and web-links addons | None |

### Files, git, search

| ID | Feature | Pri | Reuse | Build |
|---|---|---|---|---|
| S01 | File tree (virtualized) | P0 | TanStack Virtual | Tree UI |
| S02 | File watching | P0 | `notify` (FSEvents) | Debounce and event mapping |
| S03 | Ignore rules | P0 | `ignore` crate | None |
| S04 | Text search | P0 | ripgrep (bundled sidecar) or `grep-*` crates | Streaming results UI |
| S05 | Fuzzy matching (files, symbols, actions) | P0 | `nucleo` (or `fuzzy-matcher`) | Search Everywhere providers |
| S06 | Git reads (status, log, diff) | P0 | `gix` | UI |
| S07 | Git writes and worktrees | P0 | `git` CLI | Wrappers |
| S08 | Commit tool window with hunk staging, log graph | P1 | git plumbing output, an existing commit-graph lane algorithm if available | Graph rendering |
| S09 | Blame gutter | P2 | `git blame --porcelain` or `gix` | Gutter UI |

### Agent layer

| ID | Feature | Pri | Reuse | Build |
|---|---|---|---|---|
| A01 | Adapter framework (declarative config) | P0 | `toml`, `serde` | Adapter schema |
| A02 | Claude CLI: interactive and headless structured events | P0 | The CLI itself and its streaming JSON output | Event parser and normalizer |
| A03 | Other agentic CLIs | P1 | Each CLI's own structured output; evaluate the open Agent Client Protocol (ACP) where a CLI supports it | Adapters |
| A04 | Worktree isolation | P0 | `git worktree` | Lifecycle manager |
| A05 | Review inbox (per-hunk accept/reject) | P0 | `git apply`, `@codemirror/merge` | Inbox workflow (core differentiator) |
| A06 | Task queue and concurrency | P0 | `tokio` primitives | Task model |
| A07 | Session history with search | P1 | SQLite FTS5 | History UI |
| A08 | Instruction file editor (e.g. CLAUDE.md) | P1 | CodeMirror | Templates |
| A09 | Native approval prompts | P1 | UserNotifications | Mapping to agent approval events |
| A10 | Context actions (explain, fix, test, review) | P1 | The agent layer | Context packaging |
| A11 | Prompt library | P2 | None | Variables and UI |

### Change tracking (Change Ledger, section 8A)

| ID | Feature | Pri | Reuse | Build |
|---|---|---|---|---|
| C01 | Shadow repo and working-tree snapshots (tree objects via temporary index) | P0 | `git` plumbing (`update-index`, `write-tree`), `gix` for reads | Snapshot manager, incremental dirty-path logic |
| C02 | Baseline at agent session start; three-layer view | P0 | Git trees and diffs | Session model, view logic |
| C03 | Pre/post checkpoints around every agent tool call | P0 | CLI hooks or structured stream events (verify per CLI) | Hook helper and event correlation |
| C04 | Actor attribution with confidence levels | P0 | PTY foreground-process detection (`tcgetpgrp` and process info), FSEvents via `notify` | Attribution rules |
| C05 | Line-level provenance (AI / You / AI-then-You / External) | P0 | `similar` crate (or `git diff --patience`) for diffs | Provenance map and merge of origins |
| C06 | AI-only diff against a chosen starting point | P0 | `@codemirror/merge`, `git diff` | Origin filter |
| C07 | Selective revert of AI-attributed hunks (three-way) | P0 | `git apply -R`, `git merge-file` | Hunk selection, conflict view |
| C08 | Persistence of ledger in the core | P0 | SQLite | Schema (section 13) |
| C09 | Timeline of turns and tool calls | P1 | None | Timeline UI |
| C10 | Editor gutter markers, file-tree badges, review state | P1 | CodeMirror gutter and decoration APIs | Marker logic |
| C11 | Auto-detect manually started CLIs in terminal tabs | P1 | PTY process inspection | Detector and session creation |
| C12 | Contested-file handling during concurrent edits | P1 | None | Banner and merge flow |
| C13 | Commit by origin (stage AI-only or mine-only) | P1 | `git apply --cached` | Commit tool window integration |
| C14 | Native "agent finished" summary notification | P1 | UserNotifications | Summary text and action |
| C15 | Restore points with automatic safety checkpoint | P1 | Git trees | UI |
| C16 | Commit trailer, patch export | P2 | `git format-patch`/`git diff` | Options |

### Build section

| ID | Feature | Pri | Reuse | Build |
|---|---|---|---|---|
| B01 | Run configurations | P0 | None (IntelliJ concept) | Schema and UI |
| B02 | Process runner and output windows | P0 | `tokio::process`, T02 | Glue |
| B03 | Problems from compiler/test output | P1 | Machine-readable outputs first (`cargo --message-format=json`, `go test -json`, ESLint/tsc JSON, JUnit XML); regex matchers only as fallback | Normalizer |
| B04 | Test result tree and rerun failed | P1 | JUnit XML, TAP, native JSON reporters | Tree UI |
| B05 | Dev server and live preview | P1 | WKWebView, an existing port-listener crate or `lsof` | Preview pane |
| B06 | Project scaffolding | P2 | Existing generators (`cargo new`, `npm create`, `cargo-generate`, `copier`) | Template registry |
| B07 | Offline docs browser | P2 | Offline docsets (DevDocs or Dash-format), license checked | Viewer |

### Learning section

| ID | Feature | Pri | Reuse | Build |
|---|---|---|---|---|
| L01 | Content format (paths, lessons) | P1 | Markdown with YAML frontmatter, `pulldown-cmark`, shiki or tree-sitter for code blocks | Path and lesson schema |
| L02 | Exercises with automatic checks | P1 | The project's own test framework; optionally import open-licensed exercise sets (Exercism-style, rustlings-style) | Check runner and attempt records |
| L03 | Tutor agent mode | P1 | The agent layer | Tutor instruction template |
| L04 | Flashcards and scheduling | P1 | `fsrs-rs` | Card UI and generation prompt |
| L05 | Explain-anywhere | P1 | The agent layer | Entry points |
| L06 | Progress tracking | P2 | SQLite | Views |
| L07 | Diagrams in lessons | P2 | Mermaid | None |

### Shell and UI

| ID | Feature | Pri | Reuse | Build |
|---|---|---|---|---|
| U01 | Docking, splits, tabs, floating panels | P0 | `dockview-core` or similar framework-agnostic docking library, verified | IntelliJ tool-window bar behavior |
| U02 | Search Everywhere and Find Action UI | P0 | `nucleo` backend, headless UI primitives | Providers |
| U03 | Accessible UI primitives (menus, dialogs, popovers) | P1 | Bits UI or a similar headless Svelte library | Design tokens |
| U04 | Icons | P1 | SF Symbols only if Apple's license permits this use; otherwise Lucide (ISC) or Phosphor (MIT) | None |
| U05 | JetBrains-compatible keymap | P1 | None | Keymap data file |
| U06 | Light/dark, accent color, system accessibility settings | P1 | CSS media queries, native accent color query | Tokens |
| U07 | Distraction-free and presentation modes | P3 | None | None |

### macOS integration

| ID | Feature | Pri | Reuse | Build |
|---|---|---|---|---|
| M01 | Native window, toolbar, menu bar | P0 | Tauri window and menu APIs | Menu definitions |
| M02 | Keychain secrets | P0 | `keyring` crate | None |
| M03 | Vibrancy and materials | P1 | `window-vibrancy` crate (`NSVisualEffectView`) | None |
| M04 | Notifications | P1 | `tauri-plugin-notification`; UserNotifications via Swift if actions are needed | Mapping |
| M05 | Accessibility (VoiceOver, Reduce Motion, Increase Contrast) | P1 | Web and OS accessibility features | Audit |
| M06 | Signing and notarization | P1 | Apple tooling, Tauri bundler | CI script |
| M07 | Deep link, single instance, launch at login | P2 | `tauri-plugin-deep-link`, `tauri-plugin-single-instance`, `tauri-plugin-autostart` | Small `SMAppService` wrapper if needed |
| M08 | Dock badge and menu, menu bar extra | P2 | Tauri tray API | Status content |
| M09 | Spotlight, App Intents and Shortcuts, Services, Share extension, Handoff, Focus filters | P2 | OS frameworks | Thin Swift wrappers (justified: no cross-platform library exists) |
| M10 | Touch ID approvals | P2 | LocalAuthentication via `objc2` or Swift | Wrapper |
| M11 | Quick Look in file tree | P2 | `QLPreviewPanel` | Wrapper |
| M12 | macOS 27 new-API adoption pass | P2 | Apple release notes | Case by case |

### Platform

| ID | Feature | Pri | Reuse | Build |
|---|---|---|---|---|
| X01 | License and dependency audit in CI | P0 | `cargo-deny`, an npm license checker | CI config |
| X02 | Performance budgets and benchmarks | P1 | Existing benchmark tooling | Harness |
| X03 | Plugin host (JSON-RPC over stdio) | P2 | An existing JSON-RPC crate, `lsp-server` style framing | Manifest, capability policy |
| X04 | Plugin-contributed UI panels | P3 | None | None |

---

## Appendix B: Compromise rules

**Cut in this order when time or complexity is at risk:**
1. Everything marked P3 (never start).
2. P2 items, roughly in this order: Handoff/Focus/Share extension, Touch ID approvals, Quick Look, Spotlight and App Intents, plugin host, debugger, docs browser, scaffolding, local history, prompt library, blame gutter, progress analytics.
3. Polish on P1 items: animation, pixel-level Apple fidelity, secondary IntelliJ features, extra CLI adapters beyond the first.
4. Loosen P1 numeric targets (memory, startup) by up to 2x. Beyond that, redesign instead of accepting it.

**Never compromise (strictly P0):**
- No listening network port, no telemetry, offline operation (G1).
- Approved roots and path policy; agent work goes through worktree isolation and the review inbox; secrets only in Keychain (G2).
- Sessions owned by the core, surviving UI reloads (G3).
- Backpressure and batching on terminal and agent streams (G7).
- Reuse-first and license-clean dependencies; no hand-written versions of the wheels listed in section 2.2 (G4).
- Language-agnostic design through LSP, spawned CLIs, and adapters (G5).
- Change attribution: AI changes must always be separable from the user's own changes, including the user's pre-existing uncommitted edits (G16).
- The user's own repository, index, branches, and stash are never modified by tracking; snapshots live only in the shadow repo.
- The P0 items in Appendix A.

**If a P0 item seems impossible**, stop and report: what was tried, what blocks it, and two alternatives with their trade-offs. Do not silently substitute or skip.
