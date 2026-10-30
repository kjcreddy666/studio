/* Studio prototype: thirteen screens rendered from one state object. No framework, no build step. */
(function () {
  'use strict';

  const I = window.StudioIcons.svg;
  const EMBED = new URLSearchParams(location.search).has('embed');
  const $app = document.getElementById('app');

  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const G = {
    ai: '<span class="g-ai" aria-hidden="true">◆</span>',
    you: '<span class="g-you" aria-hidden="true">●</span>',
    ext: '<span class="g-ext" aria-hidden="true">▲</span>'
  };
  const glyphs = (list) => '<span class="glyphs" aria-hidden="true">' + list.map((g) => G[g]).join('') + '</span>';
  const hue = (h) => `<span aria-hidden="true" style="color:${h}">◆</span>`;

  /* ------------------------------------------------------------------ */
  /* Syntax highlighting: a tiny TypeScript tokenizer for the mock code  */
  /* ------------------------------------------------------------------ */
  const KW = /^(import|from|const|let|export|interface|function|async|await|return|if|for|new|type|void|throw|break|try|catch|unknown)$/;
  function highlight(src) {
    const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*")|(\b\d[\d_]*\b)|([A-Za-z_$][\w$]*)|(\s+)|([^\sA-Za-z_$\d"]+)/g;
    let out = '';
    let m;
    while ((m = re.exec(src)) !== null) {
      const t = esc(m[0]);
      if (m[1]) out += `<span class="cm">${t}</span>`;
      else if (m[2]) out += `<span class="s">${t}</span>`;
      else if (m[3]) out += `<span class="n">${t}</span>`;
      else if (m[4]) {
        if (KW.test(m[0])) out += `<span class="k">${t}</span>`;
        else if (/^[A-Z]/.test(m[0])) out += `<span class="ty">${t}</span>`;
        else if (src.charAt(re.lastIndex) === '(' || src.charAt(re.lastIndex) === '<') out += `<span class="f">${t}</span>`;
        else out += t;
      } else if (m[6]) out += `<span class="p">${t}</span>`;
      else out += t;
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Content                                                            */
  /* ------------------------------------------------------------------ */
  const AGENT = 'Claude · token-refresh';

  // [text, origin, hunk, flag]. Origins: you0 = you before the session, you = you during it, ai, aiyou.
  const FILES = {
    'src/auth/session.ts': {
      name: 'session.ts', badges: ['ai', 'you'], cursor: 'Ln 26, Col 41',
      crumbs: ['payments-api', 'src', 'auth', 'session.ts', 'scheduleRefresh()'],
      lines: [
        ['import { rotate, decode } from "./tokens"'],
        ['import { log } from "../log"'],
        [''],
        ['const REFRESH_WINDOW = 60_000', 'you0'],
        [''],
        ['export interface Session {'],
        ['  access: string'],
        ['  refresh: string'],
        ['  expiresAt: number'],
        ['}'],
        [''],
        ['export function isExpired(s: Session, now = Date.now()) {', 'you0'],
        ['  return s.expiresAt <= now', 'you0'],
        ['}', 'you0'],
        [''],
        ['export async function refreshIfNeeded(s: Session, now = Date.now()) {', 'ai', 'A'],
        ['  const msLeft = s.expiresAt - now', 'ai', 'A'],
        ['  if (msLeft > REFRESH_WINDOW) return s', 'ai', 'A'],
        ['  const next = await rotate(s.refresh, { retries: 1 })', 'aiyou', 'A'],
        ['  log.info("session refreshed", { msLeft })', 'ai', 'A'],
        ['  return { ...s, ...decode(next) }', 'ai', 'A'],
        ['}', 'ai', 'A'],
        [''],
        ['export function scheduleRefresh(s: Session, onNext: (s: Session) => void) {', 'ai', 'B'],
        ['  const delay = Math.max(0, s.expiresAt - Date.now() - REFRESH_WINDOW)', 'ai', 'B'],
        ['  return setTimeout(async () => onNext(await refreshIfNeeded(s)), delay)', 'ai', 'B', 'cursor'],
        ['}', 'ai', 'B']
      ]
    },
    'src/auth/tokens.ts': {
      name: 'tokens.ts', badges: ['ai'], cursor: 'Ln 12, Col 5',
      crumbs: ['payments-api', 'src', 'auth', 'tokens.ts', 'rotate()'],
      lines: [
        ['import { request } from "../http"'],
        [''],
        ['export interface TokenPair {'],
        ['  access: string'],
        ['  refresh: string'],
        ['  expiresIn: number'],
        ['}'],
        [''],
        ['export async function rotate(refresh: string, opts = { retries: 0 }): Promise<TokenPair> {', 'ai', 'C'],
        ['  for (let attempt = 0; attempt <= opts.retries; attempt++) {', 'ai', 'C'],
        ['    const res = await request("/oauth/token", { refresh })', 'ai', 'C'],
        ['    if (res.ok) return res.json()', 'ai', 'C'],
        ['    if (res.status !== 503) break', 'ai', 'C'],
        ['  }', 'ai', 'C'],
        ['  throw new Error("token rotation failed")', 'ai', 'C'],
        ['}'],
        [''],
        ['export function decode(pair: TokenPair, now = Date.now()) {'],
        ['  return { access: pair.access, refresh: pair.refresh, expiresAt: now + pair.expiresIn * 1000 }', 'ai', 'D'],
        ['}']
      ]
    },
    'src/routes/checkout.ts': {
      name: 'checkout.ts', badges: ['you'], cursor: 'Ln 8, Col 45',
      crumbs: ['payments-api', 'src', 'routes', 'checkout.ts', 'checkout.post()'],
      lines: [
        ['import { Router } from "express"'],
        ['import { charge } from "../payments"'],
        [''],
        ['export const checkout = Router()'],
        [''],
        ['checkout.post("/", async (req, res) => {'],
        ['  const { cartId, token } = req.body', 'you'],
        ['  if (!cartId) return res.status(400).end()', 'you'],
        ['  const receipt = await charge(cartId, token)'],
        ['  res.json(receipt)'],
        ['})']
      ]
    },
    'tests/session.test.ts': {
      name: 'session.test.ts', badges: ['ai'], cursor: 'Ln 1, Col 1',
      crumbs: ['payments-api', 'tests', 'session.test.ts', 'describe("refreshIfNeeded")'],
      lines: [
        ['import { describe, it, expect, vi } from "vitest"', 'ai', 'E'],
        ['import { refreshIfNeeded } from "../src/auth/session"', 'ai', 'E'],
        ['', 'ai', 'E'],
        ['describe("refreshIfNeeded", () => {', 'ai', 'E'],
        ['  it("keeps the session when expiry is far away", async () => {', 'ai', 'E'],
        ['    const s = { access: "a", refresh: "r", expiresAt: Date.now() + 120_000 }', 'ai', 'E'],
        ['    expect(await refreshIfNeeded(s)).toBe(s)', 'ai', 'E'],
        ['  })', 'ai', 'E'],
        ['})', 'ai', 'E']
      ]
    }
  };

  const HUNKS = {
    A: { file: 'src/auth/session.ts', turn: 1, tool: 'Edit', time: '10:41', what: 'refreshIfNeeded()', overlap: 19 },
    B: { file: 'src/auth/session.ts', turn: 3, tool: 'Edit', time: '10:52', what: 'scheduleRefresh()', live: true },
    C: { file: 'src/auth/tokens.ts', turn: 2, tool: 'Edit', time: '10:46', what: 'rotate() retries once on 503',
      old: ['export async function rotate(refresh: string): Promise<TokenPair> {', '  const res = await request("/oauth/token", { refresh })', '  return res.json()'] },
    D: { file: 'src/auth/tokens.ts', turn: 2, tool: 'Edit', time: '10:46', what: 'decode() stores expiry in ms',
      old: ['  return { ...pair, expiresAt: now + pair.expiresIn }'] },
    E: { file: 'tests/session.test.ts', turn: 3, tool: 'Write', time: '10:50', what: 'new test file', noRevert: true }
  };

  // Diff hunks for AI Changes. origin: ai | you (during the session) | you0 (before the session).
  const DIFFS = {
    E0a: { file: 'src/auth/session.ts', origin: 'you0', range: 'L4', lines: [['+', 4, 'const REFRESH_WINDOW = 60_000']] },
    E0b: { file: 'src/auth/session.ts', origin: 'you0', range: 'L12–14', lines: [['+', 12, 'export function isExpired(s: Session, now = Date.now()) {'], ['+', 13, '  return s.expiresAt <= now'], ['+', 14, '}']] },
    A: { file: 'src/auth/session.ts', origin: 'ai', hunk: 'A', range: 'L16–22', lines: [
      ['+', 16, 'export async function refreshIfNeeded(s: Session, now = Date.now()) {'], ['+', 17, '  const msLeft = s.expiresAt - now'],
      ['+', 18, '  if (msLeft > REFRESH_WINDOW) return s'], ['+', 19, '  const next = await rotate(s.refresh, { retries: 1 })', 'aiyou'],
      ['+', 20, '  log.info("session refreshed", { msLeft })'], ['+', 21, '  return { ...s, ...decode(next) }'], ['+', 22, '}']] },
    B: { file: 'src/auth/session.ts', origin: 'ai', hunk: 'B', range: 'L24–27', lines: [
      ['+', 24, 'export function scheduleRefresh(s: Session, onNext: (s: Session) => void) {'], ['+', 25, '  const delay = Math.max(0, s.expiresAt - Date.now() - REFRESH_WINDOW)'],
      ['+', 26, '  return setTimeout(async () => onNext(await refreshIfNeeded(s)), delay)'], ['+', 27, '}']] },
    C: { file: 'src/auth/tokens.ts', origin: 'ai', hunk: 'C', range: 'L9–15', lines: [
      ['−', 9, 'export async function rotate(refresh: string): Promise<TokenPair> {'], ['−', 10, '  const res = await request("/oauth/token", { refresh })'], ['−', 11, '  return res.json()'],
      ['+', 9, 'export async function rotate(refresh: string, opts = { retries: 0 }): Promise<TokenPair> {'], ['+', 10, '  for (let attempt = 0; attempt <= opts.retries; attempt++) {'],
      ['+', 11, '    const res = await request("/oauth/token", { refresh })'], ['+', 12, '    if (res.ok) return res.json()'], ['+', 13, '    if (res.status !== 503) break'],
      ['+', 14, '  }'], ['+', 15, '  throw new Error("token rotation failed")']] },
    D: { file: 'src/auth/tokens.ts', origin: 'ai', hunk: 'D', range: 'L19', lines: [
      ['−', 19, '  return { ...pair, expiresAt: now + pair.expiresIn }'], ['+', 19, '  return { access: pair.access, refresh: pair.refresh, expiresAt: now + pair.expiresIn * 1000 }']] },
    E: { file: 'tests/session.test.ts', origin: 'ai', hunk: 'E', range: 'L1–9 · new file', lines: FILES['tests/session.test.ts'].lines.map((l, i) => ['+', i + 1, l[0]]) },
    Y1: { file: 'src/auth/session.ts', origin: 'you', range: 'L19', note: 'edited after Claude, 10:47', lines: [['−', 19, '  const next = await rotate(s.refresh)'], ['+', 19, '  const next = await rotate(s.refresh, { retries: 1 })']] },
    Y2: { file: 'src/routes/checkout.ts', origin: 'you', range: 'L7–8', note: 'during this session, 10:44', lines: [['+', 7, '  const { cartId, token } = req.body'], ['+', 8, '  if (!cartId) return res.status(400).end()']] }
  };
  const AI_IDS = ['A', 'B', 'C', 'D', 'E'];

  const STEPS = [
    { id: 'p1', kind: 'turn', turn: 1, prompt: 'Add a silent token refresh 60 s before expiry. Keep the public API of session.ts unchanged.' },
    { id: 't1r1', kind: 'read', turn: 1, label: 'Read src/auth/session.ts', note: 'Read 27 lines. Reads change nothing; they show where the agent looked.' },
    { id: 't1r2', kind: 'read', turn: 1, label: 'Read src/auth/tokens.ts', note: 'Read 20 lines.' },
    { id: 't1e1', kind: 'edit', turn: 1, label: 'Edit src/auth/session.ts', delta: '+7', hunks: ['A'] },
    { id: 't1b1', kind: 'bash', turn: 1, label: 'Bash npm test -- session', note: 'Exit 0 in 2.1 s · 12 passed · no files changed.' },
    { id: 'p2', kind: 'turn', turn: 2, prompt: 'Retry token rotation once when the server returns 503.' },
    { id: 't2e1', kind: 'edit', turn: 2, label: 'Edit src/auth/tokens.ts', delta: '+8 −4', hunks: ['C', 'D'] },
    { id: 't2b1', kind: 'bash', turn: 2, label: 'Bash npm test', note: 'Exit 0 in 3.4 s · 14 passed · no files changed.' },
    { id: 'p3', kind: 'turn', turn: 3, prompt: 'Schedule the refresh automatically and add a test.' },
    { id: 't3w1', kind: 'edit', turn: 3, label: 'Write tests/session.test.ts', delta: '+9', hunks: ['E'] },
    { id: 't3e1', kind: 'edit', turn: 3, label: 'Edit src/auth/session.ts', delta: '+4', hunks: ['B'], live: true }
  ];

  const TREE = [
    [0, 'payments-api', 'dir'], [1, 'src', 'dir'], [2, 'auth', 'dir'],
    [3, 'session.ts', 'file', 'src/auth/session.ts'], [3, 'tokens.ts', 'file', 'src/auth/tokens.ts'], [3, 'middleware.ts', 'file'],
    [2, 'routes', 'dir'], [3, 'checkout.ts', 'file', 'src/routes/checkout.ts'], [2, 'db', 'dir', null, 'closed'], [2, 'log.ts', 'file'],
    [1, 'tests', 'dir'], [2, 'session.test.ts', 'file', 'tests/session.test.ts', 'new'], [2, 'checkout.test.ts', 'file'],
    [1, 'package.json', 'file'], [1, 'package-lock.json', 'file'], [1, 'README.md', 'file']
  ];

  const CHANGE_SESSIONS = [
    { id: 'token-refresh', hue: 'var(--hue-violet)', place: 'in place · Terminal 2' },
    { id: 'rate-limit', hue: 'var(--hue-lime)', place: 'worktree · ready for review', summary: '5 files · +20 −3 · 7 hunks. It ran in its own worktree, so nothing reaches your working tree until you apply hunks in the Review Inbox.', go: 'review' },
    { id: 'checkout-tests', hue: 'var(--hue-pink)', place: 'worktree · waiting for you', summary: 'tests/checkout.test.ts +88 so far. If you allow the install, package.json and package-lock.json show up here labelled “generated by npm install” and hidden by default.' },
    { id: 'api-docs', hue: 'var(--hue-cyan)', place: 'worktree · asking a question', summary: 'docs/openapi.yaml +64 −2 so far.' }
  ];

  const REVIEW_FILES = [
    { id: 'rate', name: 'src/middleware/rateLimit.ts', note: 'new file', hunks: [
      { id: 'h1', turn: 3, range: 'L1–4', lines: [['+', 1, 'import { TokenBucket } from "../lib/bucket"'], ['+', 2, 'const buckets = new Map<string, TokenBucket>()'], ['+', 3, ''], ['+', 4, 'export function rateLimit(opts = { rate: 20, burst: 40 }) {']] },
      { id: 'h2', turn: 3, range: 'L5–11', lines: [['+', 5, '  return (req, res, next) => {'], ['+', 6, '    const b = buckets.get(req.ip) ?? new TokenBucket(opts)'], ['+', 7, '    buckets.set(req.ip, b)'], ['+', 8, '    if (b.take()) return next()'], ['+', 9, '    res.status(429).set("Retry-After", String(b.retryAfter())).end()'], ['+', 10, '  }'], ['+', 11, '}']] }
    ] },
    { id: 'server', name: 'src/server.ts', note: '', hunks: [
      { id: 'h3', turn: 4, range: 'L3–6', lines: [[' ', 3, 'import express from "express"'], [' ', 4, 'import { cors } from "./middleware/cors"'], ['+', 5, 'import { rateLimit } from "./middleware/rateLimit"'], [' ', 6, 'import { routes } from "./routes"']] },
      { id: 'h4', turn: 4, range: 'L18–21', lines: [[' ', 18, 'app.use(cors())'], ['−', 19, 'app.use("/api", routes)'], ['+', 19, 'app.use("/api", rateLimit(config.rateLimit))'], ['+', 20, 'app.use("/api", routes)']] }
    ] },
    { id: 'config', name: 'src/config.ts', note: '', hunks: [
      { id: 'h5', turn: 5, range: 'L1–5', lines: [[' ', 1, 'export const config = {'], ['−', 2, '  port: 4000,'], ['+', 2, '  port: Number(process.env.PORT ?? 4000),'], ['+', 3, '  rateLimit: { rate: 20, burst: 40 },'], [' ', 4, '}']] }
    ] },
    { id: 'routes', name: 'src/routes/index.ts', note: '', hunks: [
      { id: 'h6', turn: 6, range: 'L40–42', conflict: true, lines: [[' ', 40, 'router.get("/health", health)'], ['−', 41, 'router.post("/checkout", checkout)'], ['+', 41, 'router.post("/checkout", rateLimit({ rate: 5, burst: 10 }), checkout)'], [' ', 42, 'router.get("/orders/:id", order)']] }
    ] },
    { id: 'readme', name: 'README.md', note: '', hunks: [
      { id: 'h7', turn: 7, range: 'L58–60', lines: [['+', 58, '## Rate limiting'], ['+', 59, ''], ['+', 60, '/api allows 20 requests a second per IP, bursting to 40. Clients get 429 with Retry-After.']] }
    ] }
  ];
  const ALL_REVIEW_HUNKS = REVIEW_FILES.reduce((a, f) => a.concat(f.hunks), []);

  const SEARCH_ITEMS = [
    { type: 'files', label: 'session.ts', detail: 'src/auth', g: ['ai', 'you'], go: 'file:src/auth/session.ts' },
    { type: 'files', label: 'tokens.ts', detail: 'src/auth', g: ['ai'], go: 'file:src/auth/tokens.ts' },
    { type: 'files', label: 'session.test.ts', detail: 'tests · new', g: ['ai'], go: 'file:tests/session.test.ts' },
    { type: 'symbols', label: 'refreshIfNeeded()', detail: 'session.ts:16', go: 'file:src/auth/session.ts' },
    { type: 'symbols', label: 'scheduleRefresh()', detail: 'session.ts:24', go: 'file:src/auth/session.ts' },
    { type: 'symbols', label: 'rotate()', detail: 'tokens.ts:9', go: 'file:src/auth/tokens.ts' },
    { type: 'actions', label: 'Delegate: write tests for refreshIfNeeded()', detail: 'opens Delegate with the symbol as context', go: 'overlay:delegate' },
    { type: 'actions', label: 'Open AI Changes', detail: 'token-refresh', go: 'tab:changes' },
    { type: 'actions', label: 'Open Mission Control', detail: '⌘8', go: 'tab:mission' },
    { type: 'actions', label: 'Settings: Agents and Trust', detail: '⌘,', go: 'overlay:settings' },
    { type: 'text', label: 'const REFRESH_WINDOW = 60_000', detail: 'session.ts:4', go: 'file:src/auth/session.ts' },
    { type: 'text', label: 'log.info("session refreshed", { msLeft })', detail: 'session.ts:20', go: 'file:src/auth/session.ts' },
    { type: 'agents', label: 'token-refresh · turn 1: added refreshIfNeeded()', detail: 'today 10:41', g: ['ai'], go: 'tab:changes' },
    { type: 'agents', label: 'token-refresh · turn 2: retry rotation once on 503', detail: 'today 10:46', g: ['ai'], go: 'tab:changes' },
    { type: 'agents', label: 'fix-flaky-login: wait for the session cookie, then assert', detail: 'today 09:42', g: ['ai'], go: 'tab:mission' }
  ];
  const SEARCH_TABS = [['all', 'All'], ['files', 'Files'], ['symbols', 'Symbols'], ['actions', 'Actions'], ['text', 'Text'], ['agents', 'Agents']];

  const SINCE = ['Session start', 'Turn 3', 'Last commit (HEAD)', 'Last reviewed'];
  const DEFAULT_PROMPT = 'Add a silent token refresh 60 s before expiry. Keep the public API of session.ts unchanged and add tests for the retry path.';

  const SCENES = [
    { id: 'workspace', code: 'S1', name: 'Workspace', ui: { left: 'project', right: 'changes', bottom: 'term2', tab: 'file:src/auth/session.ts', overlay: null } },
    { id: 'mission-control', code: 'S2', name: 'Mission Control', ui: { left: 'agents', right: null, bottom: null, tab: 'mission', overlay: null } },
    { id: 'delegate', code: 'S3', name: 'Delegate', ui: { left: 'project', right: 'changes', bottom: 'term2', tab: 'file:src/auth/session.ts', overlay: 'delegate' } },
    { id: 'ai-changes', code: 'S4', name: 'AI Changes', ui: { left: 'project', right: null, bottom: null, tab: 'changes', overlay: null } },
    { id: 'review', code: 'S5', name: 'Review Inbox', ui: { left: null, right: 'inbox', bottom: null, tab: 'review', overlay: null } },
    { id: 'approval', code: 'S6', name: 'Approval', ui: { left: 'project', right: 'changes', bottom: 'term2', tab: 'file:src/auth/session.ts', overlay: 'attention', attention: 'approval' } },
    { id: 'question', code: 'S7', name: 'Question', ui: { left: 'project', right: 'changes', bottom: 'term2', tab: 'file:src/auth/session.ts', overlay: 'attention', attention: 'question' } },
    { id: 'console', code: 'S8', name: 'Agent Console', ui: { left: 'project', right: 'changes', bottom: 'console', bottomH: 340, tab: 'file:src/auth/session.ts', overlay: null }, consoleSession: 'token-refresh' },
    { id: 'search', code: 'S9', name: 'Search Everywhere', ui: { left: 'project', right: 'changes', bottom: 'term2', tab: 'file:src/auth/session.ts', overlay: 'search' } },
    { id: 'terminal', code: 'S10', name: 'Terminal tracking', ui: { left: 'project', right: null, bottom: 'term2', bottomH: 360, tab: 'file:src/auth/session.ts', overlay: null } },
    { id: 'settings', code: 'S11', name: 'Settings: Agents and Trust', ui: { left: 'project', right: 'changes', bottom: null, tab: 'file:src/auth/session.ts', overlay: 'settings', settingsTab: 'agents' } },
    { id: 'learning', code: 'S12', name: 'Learning', ui: { left: 'learning', right: null, bottom: 'console', bottomH: 250, tab: 'lesson', overlay: null }, consoleSession: 'tutor' },
    { id: 'welcome', code: 'S13', name: 'Welcome and first run', ui: { left: null, right: null, bottom: null, tab: 'welcome', overlay: null } }
  ];

  const NOTES = {
    workspace: { what: 'The default workspace. Claude CLI runs in Terminal 2 and edits session.ts in place while you keep working.', tries: ['Click a gutter mark. Solid bar = you, notched bar = agent, half and half = agent then you.', 'From the line card, revert scheduleRefresh() (a clean revert) and refreshIfNeeded() (it overlaps your edit on line 19, so Studio refuses and explains).', 'Switch AI only / Mine / Everything in AI Changes and watch the gutter.', 'Drag panel edges. Click a stripe icon twice to hide its panel.'], spec: 'screen-s1' },
    'mission-control': { what: 'All agent sessions at a glance, ordered so blocking items come first.', tries: ['Allow or deny the install for checkout-tests; the card moves to Working.', 'Answer api-docs’ question from its card.', 'Interrupt token-refresh and see the workspace banner change.'], spec: 'screen-s2' },
    delegate: { what: 'Handing work to an agent: what, context, where it runs, how much it may do, and when it is done.', tries: ['Switch Where to In place: Autopilot disables, because it is allowed only in a worktree.', 'Remove a context chip, then Delegate. The new task appears in Mission Control.'], spec: 'screen-s3' },
    'ai-changes': { what: 'Everything one agent session changed, by turn and tool call, kept apart from your own work.', tries: ['Click timeline ticks to see a single step’s change.', 'Mark hunks reviewed; the status bar count drops.', 'Open “Your earlier changes” to see layer 1: your edits from before the session.'], spec: 'screen-s4' },
    review: { what: 'Worktree results come back here. Nothing touches your files until you apply.', tries: ['Use J and K to move between hunks, A to accept, X to reject.', 'Open routes/index.ts: its hunk overlaps your uncommitted edit, so it offers Resolve instead of Accept.', 'Apply, then check Mission Control and Needs you.'], spec: 'screen-s5' },
    approval: { what: 'A headless agent asks permission. The request waits in the queue; nothing steals focus.', tries: ['Tick “Always allow…”, then Allow. The rule shows up in Settings → Agents.', 'Simulate the background notification below.'], spec: 'screen-s6', notify: true },
    question: { what: 'An agent asks a question with options; your answer returns to it as the tool result.', tries: ['Pick an option, or type your own answer and Send.'], spec: 'screen-s7' },
    console: { what: 'The agent’s conversation: messages, collapsible tool calls, its plan, and links into exact diffs.', tries: ['Expand a tool call.', 'Send the agent a message.'], spec: 'screen-s8' },
    search: { what: 'Search Everywhere, with an Agents tab over session history.', tries: ['Type, use ↑ and ↓, press Enter.', 'Press Shift twice anywhere to open it again.'], spec: 'screen-s9' },
    terminal: { what: 'A CLI you started by hand is detected and tracked; the banner says how precise attribution is.', tries: ['Follow “Make tracking precise” to the opt-in hook in Settings.'], spec: 'screen-s10' },
    settings: { what: 'Adapters, default trust, remembered approvals, precise tracking, privacy, retention.', tries: ['Revoke a remembered approval.', 'Turn on precise tracking.'], spec: 'screen-s11' },
    learning: { what: 'A lesson with an exercise and a tutor that explains and hints but does not write the solution.', tries: ['Press Check: one check fails.', 'Ask the tutor for a hint, click the highlighted line to fix it, then Check again.'], spec: 'screen-s12' },
    welcome: { what: 'First run: project folder, detected tools, keymap, default trust.', tries: ['Step through and finish; you land in the workspace.'], spec: 'screen-s13' }
  };

  /* ------------------------------------------------------------------ */
  /* State                                                              */
  /* ------------------------------------------------------------------ */
  function initialState() {
    return {
      scene: 'workspace',
      ui: { left: 'project', right: 'changes', bottom: 'term2', tab: 'file:src/auth/session.ts', overlay: null, attention: 'approval', settingsTab: 'agents', leftW: 272, rightW: 344, bottomH: 190 },
      openTabs: ['file:src/auth/session.ts', 'file:src/auth/tokens.ts', 'file:src/routes/checkout.ts'],
      mode: 'ai', since: 0, card: null, reverted: {}, reviewed: {},
      paused: false, tokenStopped: false,
      approval: null, remember: false, answer: null, draft: '',
      review: { dec: {}, sel: 'server', view: 'unified', applied: 0, focus: 0 },
      reviewSnoozed: false,
      delegate: { prompt: DEFAULT_PROMPT, where: 'worktree', trust: 'propose', doneTests: true, limit: true, removed: {}, submitted: false },
      delegated: null,
      search: { q: 'refresh', tab: 'all', sel: 0 },
      changes: { session: 'token-refresh', step: null, file: null, earlier: false },
      consoleSession: 'token-refresh', consoleExtra: { 'token-refresh': [], tutor: [] }, consoleDraft: '', expanded: {},
      rules: [
        { id: 'r1', pattern: 'npm test *', scope: 'Project · payments-api', created: 'Oct 28' },
        { id: 'r2', pattern: 'git status', scope: 'All projects', created: 'Oct 12' }
      ],
      settings: { headless: 'propose', interactive: 'pair', precise: true, shareFocus: false, retention: '30 days', keymap: 'jetbrains', reopen: true, gutter: true, notify: { approval: true, question: true, review: true, failed: true, long: false } },
      git: { stage: 'mine', msg: '', trailer: false },
      lesson: { result: null, fixed: false, hint: false },
      welcome: { step: 0, folder: false, keymap: 'jetbrains', trust: 'propose' },
      ran: false, toast: null, notesOpen: false
    };
  }
  let state = initialState();
  let toastTimer = null;
  let focusAfter = null;

  /* ------------------------------------------------------------------ */
  /* Derived data                                                       */
  /* ------------------------------------------------------------------ */
  function agentsSummary() {
    const running = [!state.tokenStopped, true, true, !!state.delegated].filter(Boolean).length;
    const need = (state.approval ? 0 : 1) + (state.answer ? 0 : 1);
    return { running, need };
  }
  function attentionItems() {
    return [
      { id: 'approval', name: 'checkout-tests', hue: 'var(--hue-pink)', kind: 'approval', summary: 'wants to run npm install --save-dev msw@2', age: '2 min', done: !!state.approval },
      { id: 'question', name: 'api-docs', hue: 'var(--hue-cyan)', kind: 'question', summary: 'asks whether to document the deprecated v1 endpoints', age: '4 min', done: !!state.answer },
      { id: 'review', name: 'rate-limit', hue: 'var(--hue-lime)', kind: 'review', summary: state.review.applied ? 'applied to your working tree' : '7 hunks ready · tests passed', age: '18 min', done: state.reviewSnoozed || state.review.applied > 0 }
    ];
  }
  const openAttention = () => attentionItems().filter((i) => !i.done).length;

  function visibleDiffs(opts) {
    const o = opts || {};
    const mode = o.mode || state.mode;
    let ids;
    if (mode === 'ai') ids = AI_IDS.slice();
    else if (mode === 'mine') ids = state.since === 2 ? ['E0a', 'E0b', 'Y1', 'Y2'] : ['Y1', 'Y2'];
    else ids = ['E0a', 'E0b', 'A', 'B', 'C', 'D', 'E', 'Y2'];
    ids = ids.filter((id) => !(DIFFS[id].hunk && state.reverted[DIFFS[id].hunk]));
    if (mode === 'ai' && state.since === 1 && !o.step) ids = ids.filter((id) => HUNKS[id].turn >= 3);
    if (mode === 'ai' && state.since === 3 && !o.step) ids = ids.filter((id) => !state.reviewed[id]);
    if (o.step) {
      const st = STEPS.find((s) => s.id === o.step);
      ids = ids.filter((id) => (st.hunks || []).includes(id));
    }
    if (o.file) ids = ids.filter((id) => DIFFS[id].file === o.file);
    return ids;
  }
  function countLines(ids) {
    let plus = 0;
    let minus = 0;
    ids.forEach((id) => DIFFS[id].lines.forEach((l) => { if (l[0] === '+') plus++; if (l[0] === '−') minus++; }));
    return { plus, minus };
  }
  function changeFiles(opts) {
    const ids = visibleDiffs(opts);
    const mode = (opts && opts.mode) || state.mode;
    const order = [];
    const byFile = {};
    ids.forEach((id) => {
      const d = DIFFS[id];
      if (!byFile[d.file]) { byFile[d.file] = { file: d.file, ids: [], g: new Set() }; order.push(d.file); }
      byFile[d.file].ids.push(id);
      if (d.origin === 'ai') byFile[d.file].g.add('ai');
      if (d.origin !== 'ai' || d.lines.some((l) => l[3] === 'aiyou')) byFile[d.file].g.add('you');
    });
    return order.map((f) => {
      const e = byFile[f];
      const c = countLines(e.ids);
      let note = '';
      if (mode === 'ai') { const n = e.ids.filter((id) => !state.reviewed[id]).length; note = n ? `${n} to review` : 'reviewed'; }
      else if (mode === 'mine') note = e.ids.every((id) => DIFFS[id].origin === 'you0') ? 'before session' : e.ids.includes('Y1') ? 'after Claude' : 'this session';
      return { file: f, ids: e.ids, plus: c.plus, minus: c.minus, g: ['ai', 'you'].filter((x) => e.g.has(x)), note, isNew: f === 'tests/session.test.ts' };
    });
  }
  function unreviewedCount() { return AI_IDS.filter((id) => !state.reverted[id] && !state.reviewed[id]).length; }
  function summaryText() {
    const files = changeFiles();
    const c = countLines(visibleDiffs());
    const prefix = state.mode === 'ai' && state.since === 1 ? 'Since turn 3 · ' : '';
    if (state.mode === 'ai') return `${prefix}Agent: ${files.length} files · +${c.plus} −${c.minus} · ${unreviewedCount()} hunks to review`;
    if (state.mode === 'mine') return `You${state.since === 2 ? ' since HEAD' : ' during this session'}: ${files.length} files · +${c.plus} −${c.minus}`;
    return `Everything since HEAD: ${files.length} files · +${c.plus} −${c.minus}`;
  }
  function tokenStats() {
    const ids = AI_IDS.filter((id) => !state.reverted[id]);
    const c = countLines(ids);
    const files = new Set(ids.map((id) => DIFFS[id].file)).size;
    return `${files} files · +${c.plus} −${c.minus} · ${unreviewedCount()} hunks to review in AI Changes`;
  }
  function displayLines(path) {
    const out = [];
    const shownOld = {};
    FILES[path].lines.forEach((row) => {
      const text = row[0];
      const origin = row[1] || '';
      const hunk = row[2];
      if (hunk && state.reverted[hunk]) {
        if (shownOld[hunk]) return;
        shownOld[hunk] = true;
        (HUNKS[hunk].old || []).forEach((t) => out.push({ text: t, origin: '' }));
        return;
      }
      out.push({ text, origin, hunk, cursor: row[3] === 'cursor' && !state.tokenStopped });
    });
    return out.map((l, i) => Object.assign(l, { n: i + 1 }));
  }
  const reviewDecided = (id) => !!state.review.dec[id];
  const reviewAccepted = () => ALL_REVIEW_HUNKS.filter((h) => ['accepted', 'resolved'].includes(state.review.dec[h.id])).length;

  /* ------------------------------------------------------------------ */
  /* Window                                                             */
  /* ------------------------------------------------------------------ */
  function windowHTML() {
    if (state.ui.tab === 'welcome') return welcomeWindow();
    const u = state.ui;
    return `<div class="win" style="--left-w:${u.leftW}px;--right-w:${u.rightW}px;--bottom-h:${u.bottomH}px">
      ${toolbar()}
      <div class="workspace">
        ${stripes()}
        ${u.left ? leftPanel() : ''}
        ${center()}
        ${u.right ? rightPanel() : ''}
        ${u.bottom ? bottomPanel() : ''}
      </div>
      ${statusbar()}
      ${overlay()}
      ${toastHTML()}
    </div>`;
  }

  function toolbar() {
    const s = agentsSummary();
    const open = openAttention();
    const pillLabel = `${s.running} agents running${s.need ? `, ${s.need} need you` : ''}. Open Mission Control`;
    return `<header class="toolbar">
      <div class="traffic" aria-hidden="true"><span class="c"></span><span class="m"></span><span class="x"></span></div>
      <button type="button" class="tbtn" data-action="toast" data-arg="Project switcher: recent projects, Open…, and Open in new window.">${I('folder', 'md')} payments-api ${I('chevronDown', 'sm')}</button>
      <button type="button" class="tbtn" data-action="toast" data-arg="Branch switcher: local and remote branches, plus the worktrees agents are using.">${I('branch', 'md')} feat/token-refresh ${I('chevronDown', 'sm')}</button>
      <span class="tsep" aria-hidden="true"></span>
      <button type="button" class="tbtn" data-action="toast" data-arg="Run configurations: test, dev, lint.">test ${I('chevronDown', 'sm')}</button>
      <button type="button" class="ibtn run" aria-label="Run test" title="Run test" data-action="run">${I('play', 'md')}</button>
      <button type="button" class="ibtn" aria-label="Stop" title="Stop" data-action="toast" data-arg="Nothing is running.">${I('stop', 'sm')}</button>
      <button type="button" class="ibtn" aria-label="Rerun" title="Rerun" data-action="run">${I('rerun', 'md')}</button>
      <span class="spacer"></span>
      <button type="button" class="pill" data-action="tab" data-arg="mission" aria-label="${pillLabel}">${G.ai}<span>${s.running} agents</span>${s.need ? `<span class="sep" aria-hidden="true">·</span><span class="attn">${s.need} need you</span>` : ''}</button>
      <button type="button" class="tbtn needs" data-action="overlay" data-arg="attention" aria-haspopup="dialog" aria-expanded="${state.ui.overlay === 'attention'}" aria-label="Needs you: ${open} items">${I('tray', 'md')} Needs you <span class="count${open ? '' : ' zero'}">${open}</span></button>
      <button type="button" class="btn btn-primary" data-action="overlay" data-arg="delegate">${I('sparkle', 'md')} Delegate</button>
      <button type="button" class="ibtn" aria-label="Search Everywhere (Shift Shift)" title="Search Everywhere (Shift Shift)" data-action="overlay" data-arg="search">${I('search', 'md')}</button>
      <button type="button" class="ibtn" aria-label="Settings" title="Settings (⌘,)" data-action="overlay" data-arg="settings">${I('gear', 'md')}</button>
    </header>`;
  }

  function stripes() {
    const u = state.ui;
    const b = (side, id, icon, label, pressed, extra) => `<button type="button" class="ibtn ${extra || ''}" aria-label="${label}" title="${label}" aria-pressed="${pressed}" data-action="${side}" data-arg="${id}">${I(icon)}${extra === 'agent' && agentsSummary().need ? '<span class="dotbadge" aria-hidden="true"></span>' : ''}</button>`;
    return `<nav class="stripe left" aria-label="Tool windows">
        ${b('left', 'project', 'folder', 'Project', u.left === 'project')}
        ${b('left', 'structure', 'structure', 'Structure', u.left === 'structure')}
        ${b('left', 'git', 'branch', 'Git', u.left === 'git')}
        ${b('left', 'agents', 'agent', 'Agents', u.left === 'agents', 'agent')}
        ${b('left', 'learning', 'book', 'Learning', u.left === 'learning')}
        <span class="fill"></span>
        ${b('bottom', 'term2', 'terminal', 'Terminal', u.bottom === 'term1' || u.bottom === 'term2')}
        ${b('bottom', 'problems', 'problems', 'Problems', u.bottom === 'problems')}
        ${b('bottom', 'console', 'console', 'Agent Console', u.bottom === 'console')}
        ${b('bottom', 'run', 'play', 'Run', u.bottom === 'run')}
      </nav>
      <nav class="stripe right" aria-label="Review tool windows">
        ${b('right', 'changes', 'changes', 'AI Changes', u.right === 'changes', 'agent')}
        ${b('right', 'inbox', 'inbox', 'Review Inbox', u.right === 'inbox')}
        ${b('right', 'notes', 'notes', 'Notes', u.right === 'notes')}
        ${b('right', 'preview', 'preview', 'Preview', u.right === 'preview')}
      </nav>`;
  }

  /* ------------------------------ Left panels ------------------------------ */
  function leftPanel() {
    const id = state.ui.left;
    const body = { project: projectPanel, structure: structurePanel, git: gitPanel, agents: agentsPanel, learning: learningPanel }[id]();
    return `<aside class="panel left" aria-label="${esc(id)} tool window"><div class="grip-x" data-grip="left" aria-hidden="true"></div>${body}</aside>`;
  }
  function projectPanel() {
    const rows = TREE.map((r) => {
      const [depth, label, kind, path, extra] = r;
      const pad = `padding-left:${10 + depth * 14}px`;
      const isDir = kind === 'dir';
      const chev = isDir ? (extra === 'closed' ? '▸' : '▾') : '';
      let badges = '';
      let note = '';
      if (path && FILES[path]) badges = glyphs(FILES[path].badges);
      if (extra === 'new') note = 'new';
      if (label === 'package-lock.json') note = '';
      const sel = path && state.ui.tab === 'file:' + path;
      const inner = `<span class="chev" aria-hidden="true">${chev}</span><span class="tlabel">${esc(label)}</span>${note ? `<span class="tnote">${note}</span>` : ''}${badges}`;
      return path
        ? `<button type="button" class="trow${sel ? ' sel' : ''}" style="${pad}" data-action="open" data-arg="${path}">${inner}</button>`
        : `<div class="trow${isDir ? ' dir' : ''}" style="${pad}">${inner}</div>`;
    }).join('');
    return `<div class="phead"><span>Project</span><span class="meta">${G.ai} agent · ${G.you} you</span></div><div class="pbody" data-scroll="left:project"><div class="tree">${rows}</div></div>`;
  }
  function structurePanel() {
    const items = [['C', 'REFRESH_WINDOW', ['you']], ['I', 'Session', []], ['F', 'isExpired()', ['you']], ['F', 'refreshIfNeeded()', ['ai', 'you']], ['F', 'scheduleRefresh()', ['ai']]];
    return `<div class="phead"><span>Structure</span><span class="meta">session.ts</span></div><div class="pbody">${items.map(([k, n, g]) => `<div class="outline-row"><span class="kind-tag" aria-hidden="true">${k}</span><span class="tlabel">${esc(n)}</span>${glyphs(g)}</div>`).join('')}</div>`;
  }
  function gitPanel() {
    const g = state.git;
    const staged = { mine: 'Your hunks only: checkout.ts +2, session.ts line 19, and your earlier edits (+4). Agent hunks stay unstaged.', ai: 'Agent hunks only: session.ts, tokens.ts, session.test.ts (+28 −4). Your hunks stay unstaged.', all: 'Everything: 4 files, +34 −4.' }[g.stage];
    const rows = [['src/routes/checkout.ts', ['you'], 'you'], ['src/auth/session.ts', ['ai', 'you'], 'agent and you'], ['src/auth/tokens.ts', ['ai'], 'agent'], ['tests/session.test.ts', ['ai'], 'agent · new']];
    return `<div class="phead"><span>Git · Commit</span><span class="meta">feat/token-refresh</span></div>
      <div class="pbody"><div class="pad stack" style="gap:12px">
        <div class="flist">${rows.map(([f, gl, who]) => `<div class="frow"><span class="name">${esc(f)}</span>${glyphs(gl)}<span class="muted small">${who}</span></div>`).join('')}</div>
        <div class="field"><span class="flabel" id="stage-l">Stage by origin</span>
          <div class="seg" role="group" aria-labelledby="stage-l">${[['mine', 'Mine only'], ['ai', 'AI only'], ['all', 'Everything']].map(([id, l]) => `<button type="button" aria-pressed="${g.stage === id}" data-action="git-stage" data-arg="${id}">${l}</button>`).join('')}</div>
          <span class="soft small">${staged}</span></div>
        <label class="field"><span class="flabel">Commit message</span><textarea class="textarea" rows="3" data-input="git-msg" data-fkey="git-msg" placeholder="Describe what you changed">${esc(g.msg)}</textarea></label>
        <label class="check"><input type="checkbox" data-change="git-trailer" ${g.trailer ? 'checked' : ''}> Add “AI-Assisted: claude token-refresh” trailer (off by default)</label>
        <button type="button" class="btn btn-primary" data-action="git-commit" ${g.msg.trim() ? '' : 'disabled'}>Commit</button>
      </div></div>`;
  }
  function agentsPanel() {
    const rows = [
      ['token-refresh', 'var(--hue-violet)', state.tokenStopped ? 'stopped by you' : state.paused ? 'paused' : 'editing session.ts · in place', false],
      ['checkout-tests', 'var(--hue-pink)', state.approval ? 'running · worktree' : 'needs approval', !state.approval],
      ['api-docs', 'var(--hue-cyan)', state.answer ? 'writing docs · worktree' : 'asked a question', !state.answer],
      ['rate-limit', 'var(--hue-lime)', state.review.applied ? 'applied' : 'ready for review', false]
    ];
    if (state.delegated) rows.push([state.delegated.name, 'var(--hue-orange)', 'starting', false]);
    return `<div class="phead"><span>Agents</span><button type="button" class="ibtn" aria-label="Open Mission Control as a tab" title="Open as tab" data-action="tab" data-arg="mission">${I('window', 'md')}</button></div>
      <div class="pbody">${rows.map(([n, h, st, attn]) => `<button type="button" class="agentrow" data-action="tab" data-arg="mission">${hue(h)}<span class="grow"><span>${esc(n)}</span><span class="st${attn ? ' attn' : ''}">${esc(st)}</span></span></button>`).join('')}
      <div class="pad"><button type="button" class="btn" style="width:100%" data-action="overlay" data-arg="delegate">${I('sparkle', 'md')} Delegate a task</button></div></div>`;
  }
  function learningPanel() {
    return `<div class="phead"><span>Learning</span><span class="meta">local progress</span></div>
      <div class="pbody">
        <div class="pathcard"><strong>TypeScript async</strong><span class="soft">4 of 8 lessons</span><div class="progress" aria-label="50 percent"><span style="width:50%"></span></div>
          <span class="muted">✓ Promises · ✓ async and await · ✓ Error handling · <span style="color:var(--text-primary)">● Retrying async calls</span> · ○ Timeouts</span></div>
        <div class="pathcard"><strong>Rust for TypeScript developers</strong><span class="soft">0 of 12 lessons</span><div class="progress" aria-label="0 percent"><span style="width:0%"></span></div></div>
        <div class="pathcard"><strong>Flashcards</strong><span class="soft">12 due today · scheduled with FSRS</span><button type="button" class="btn btn-sm" style="align-self:flex-start" data-action="toast" data-arg="Card review opens as a tab: keyboard-first, 1–4 to rate.">Review cards</button></div>
      </div>`;
  }

  /* ------------------------------ Right panels ----------------------------- */
  function rightPanel() {
    const id = state.ui.right;
    const body = { changes: changesPanel, inbox: inboxPanel, notes: notesPanel, preview: previewPanel }[id]();
    return `<aside class="panel right" aria-label="${esc(id)} tool window"><div class="grip-x" data-grip="right" aria-hidden="true"></div>${body}</aside>`;
  }
  function modeSeg() {
    return `<div class="seg" role="group" aria-label="Show changes by">${[['ai', 'AI only'], ['mine', 'Mine'], ['all', 'Everything']].map(([id, l]) => `<button type="button" aria-pressed="${state.mode === id}" data-action="mode" data-arg="${id}">${l}</button>`).join('')}</div>`;
  }
  function timeline(big) {
    return `<div class="timeline${big ? ' big' : ''}" role="group" aria-label="Timeline of turns and tool calls">${STEPS.map((s) => {
      const label = s.kind === 'turn' ? `Turn ${s.turn}: ${s.prompt}` : `${s.label}${s.delta ? ' ' + s.delta : ''}`;
      const inner = s.kind === 'turn' ? `<span class="turn">${s.turn}</span>` : `<span class="${s.kind}${s.live ? ' live' : ''}"></span>`;
      return `<button type="button" class="tk" title="${esc(label)}" aria-label="${esc(label)}" aria-pressed="${state.changes.step === s.id}" data-action="step" data-arg="${s.id}">${inner}</button>`;
    }).join('')}</div>`;
  }
  function changesPanel() {
    const files = changeFiles();
    return `<div class="phead"><span>AI Changes</span><button type="button" class="ibtn" aria-label="Open AI Changes as a tab" title="Open as tab" data-action="tab" data-arg="changes">${I('window', 'md')}</button></div>
      <div class="pbody" data-scroll="right:changes"><div class="pad stack" style="gap:12px">
        <button type="button" class="sessbtn" data-action="tab" data-arg="changes">${G.ai}<span style="flex:1;min-width:0"><span class="t">token-refresh</span><span class="d">Claude CLI · in place · Terminal 2 · ${state.settings.precise ? 'hooks: certain' : 'watching files: likely'}</span></span>${I('chevronDown', 'sm')}</button>
        <div class="soft" role="status">${esc(summaryText())}</div>
        ${modeSeg()}
        <button type="button" class="tbtn" style="justify-content:space-between" data-action="since"><span>Since: <strong>${SINCE[state.since]}</strong></span>${I('chevronDown', 'sm')}</button>
        <div><div class="muted small" style="margin-bottom:6px">Timeline · turns and tool calls</div>${timeline(false)}</div>
        <div class="flist">${files.length ? files.map((f) => `<button type="button" class="frow" data-action="open" data-arg="${f.file}"><span class="name">${esc(f.file)}</span>${glyphs(f.g)}<span class="plus">+${f.plus}</span>${f.minus ? `<span class="minus">−${f.minus}</span>` : ''}<span class="muted small">${f.isNew && state.mode === 'ai' ? 'new · ' : ''}${esc(f.note)}</span></button>`).join('') : '<div class="frow dim">No changes match this view.</div>'}</div>
        ${state.mode !== 'all' && state.since !== 2 ? `<button type="button" class="frow dim" style="border:1px dashed #4A4A55;border-radius:6px" data-action="earlier">${G.you}<span class="name">Your earlier changes (before this session)</span><span class="small">1 file ›</span></button>` : ''}
        <div class="row"><button type="button" class="btn btn-primary" data-action="tab" data-arg="changes">Review all</button><button type="button" class="btn" data-action="revert-session">Revert session…</button><button type="button" class="btn btn-quiet" data-action="toast" data-arg="Copied token-refresh.patch: the agent's changes only, as a unified diff.">Export patch</button></div>
      </div></div>`;
  }
  function inboxPanel() {
    const ready = !state.review.applied;
    return `<div class="phead"><span>Review Inbox</span><span class="meta">worktree results</span></div>
      <div class="pbody"><div class="pad stack" style="gap:10px">
        ${ready ? `<div class="card"><div class="chead">${hue('var(--hue-lime)')}<span class="name">rate-limit</span><span class="badge">WORKTREE</span></div><div class="soft small">5 files · <span class="plus">+20</span> <span class="minus">−3</span> · 7 hunks · ${reviewDecidedCount()} decided</div><div class="small" style="color:var(--success)">✓ test passed (48)</div><button type="button" class="btn btn-primary" data-action="tab" data-arg="review">Open review</button></div>` : `<div class="empty">rate-limit was applied. Nothing else is waiting for review.</div>`}
        <div class="card"><div class="chead">${hue('var(--hue-pink)')}<span class="name">checkout-tests</span><span class="badge">WORKTREE</span></div><div class="soft small">Still running. Its results land here when it finishes.</div></div>
      </div></div>`;
  }
  const reviewDecidedCount = () => ALL_REVIEW_HUNKS.filter((h) => reviewDecided(h.id)).length;
  function notesPanel() {
    return `<div class="phead"><span>Notes</span><button type="button" class="ibtn" aria-label="New note" data-action="toast" data-arg="Notes are local Markdown, searchable from Search Everywhere.">${I('plus', 'md')}</button></div>
      <div class="pbody"><div class="pad stack" style="gap:10px">
        <div class="card"><strong>Token refresh</strong><span class="soft small">Public API of session.ts must not change. Mobile clients call isExpired() directly.</span></div>
        <div class="card"><strong>Rate limits</strong><span class="soft small">Checkout gets a stricter bucket (5/s). Ask security before raising it.</span></div>
      </div></div>`;
  }
  function previewPanel() {
    return `<div class="phead"><span>Preview</span><span class="meta">from Terminal 1</span></div>
      <div class="pbody"><div class="pad stack" style="gap:10px">
        <div class="row"><span class="dot" style="background:var(--success)" aria-hidden="true"></span><span class="mono small">http://localhost:4000/health</span></div>
        <pre class="cmd">{ "status": "ok", "uptime": 431, "version": "1.8.0" }</pre>
        <span class="muted small">Studio detected the dev server's port from the process. The server listens on your machine; Studio itself opens no ports.</span>
      </div></div>`;
  }

  /* -------------------------------- Center -------------------------------- */
  function tabInfo(id) {
    if (id.startsWith('file:')) { const p = id.slice(5); return { label: FILES[p].name, g: FILES[p].badges, closable: false }; }
    return {
      mission: { label: 'Mission Control', icon: 'agent', closable: true },
      changes: { label: 'AI Changes · token-refresh', icon: 'changes', closable: true },
      review: { label: 'Review: rate-limit', icon: 'inbox', closable: true },
      lesson: { label: 'Lesson: Retrying async calls', icon: 'book', closable: true }
    }[id];
  }
  function center() {
    const t = state.ui.tab;
    let view = '';
    if (t.startsWith('file:')) view = fileView(t.slice(5));
    else if (t === 'mission') view = missionView();
    else if (t === 'changes') view = changesView();
    else if (t === 'review') view = reviewView();
    else if (t === 'lesson') view = lessonView();
    const tabs = state.openTabs.map((id) => {
      const info = tabInfo(id);
      const sel = id === t;
      return `<div class="tabwrap${sel ? ' sel' : ''}"><button type="button" role="tab" class="tab" aria-selected="${sel}" data-action="tab" data-arg="${id}">${info.icon ? I(info.icon) : ''}${esc(info.label)}${info.g ? glyphs(info.g) : ''}</button>${info.closable ? `<button type="button" class="close" aria-label="Close ${esc(info.label)}" data-action="closetab" data-arg="${id}">${I('close', 'sm')}</button>` : ''}</div>`;
    }).join('');
    return `<main class="center" aria-label="Editor"><div class="tabs" role="tablist" aria-label="Editor tabs">${tabs}</div>${view}${state.card ? hoverCard() : ''}</main>`;
  }

  const SHOW = { ai: ['ai', 'aiyou'], mine: ['you0', 'you', 'aiyou'], all: ['you0', 'you', 'ai', 'aiyou'] };
  const MARK = { ai: 'm-ai', aiyou: 'm-aiyou', you: 'm-you', you0: 'm-you' };
  const TINT = { ai: { ai: 't-ai', aiyou: 't-ai' }, mine: { you0: 't-you', you: 't-you', aiyou: 't-you' }, all: {} };
  function markLabel(l) {
    const h = l.hunk ? HUNKS[l.hunk] : null;
    const conf = state.settings.precise ? 'certain' : 'likely';
    if (l.origin === 'ai') return `Changed by Claude, session token-refresh, turn ${h.turn}, ${h.tool}, ${conf}`;
    if (l.origin === 'aiyou') return `Written by Claude in turn ${h.turn} (${conf}), then edited by you`;
    if (l.origin === 'you0') return 'Changed by you before this session';
    return 'Changed by you during this session';
  }
  function fileView(path) {
    const f = FILES[path];
    const crumbs = f.crumbs.map((c, i) => `<span class="${i >= f.crumbs.length - 2 ? 'cur' : ''}">${esc(c)}</span>`).join('<span aria-hidden="true">›</span>');
    const lines = displayLines(path).map((l) => {
      const shown = l.origin && SHOW[state.mode].includes(l.origin);
      const likely = (l.origin === 'ai' || l.origin === 'aiyou') && !state.settings.precise;
      const tint = TINT[state.mode][l.origin] || '';
      const label = shown ? markLabel(l) : '';
      const mark = shown
        ? `<button type="button" class="gut ${MARK[l.origin]}${likely ? ' m-likely' : ''}" aria-label="Line ${l.n}: ${esc(label)}" title="${esc(label)}" data-action="card" data-arg="${path}|${l.n}"></button>`
        : '<span class="gut" aria-hidden="true"></span>';
      const cursor = l.cursor ? `<span class="presence"><span class="caret" aria-hidden="true"></span><span class="flag">◆ ${AGENT}${state.paused ? ' · paused' : ''}</span></span>` : '';
      return `<div class="cl ${tint}"><span class="ln">${l.n}</span>${mark}<span class="src">${highlight(l.text)}</span>${cursor}</div>`;
    }).join('');
    return `<div class="crumbs">${crumbs}</div>${fileBanner(path)}<div class="code" data-scroll="code:${path}" role="region" aria-label="${esc(f.name)} source">${lines}</div>`;
  }
  function fileBanner(path) {
    if (path !== 'src/auth/session.ts') return '';
    if (state.tokenStopped) return `<div class="banner neutral" role="status">${G.ai}<span class="grow">token-refresh was stopped. Its changes stay in AI Changes, where you can review or revert them.</span><button type="button" class="linkbtn" data-action="tab" data-arg="changes">Open AI Changes</button></div>`;
    if (state.paused) return `<div class="banner ai" role="status">${G.ai}<span class="grow"><strong>Paused.</strong> Claude · token-refresh stops before its next tool call.</span><button type="button" class="btn btn-sm" data-action="pause">Resume agent</button></div>`;
    return `<div class="banner ai" role="status">${G.ai}<span class="grow"><strong>Claude · token-refresh</strong> is editing this file (turn 3, Edit). Your saves merge with its changes instead of overwriting them.</span><button type="button" class="linkbtn" data-action="tab" data-arg="changes">View live diff</button><button type="button" class="btn btn-sm" data-action="pause">Pause agent</button></div>`;
  }
  function hoverCard() {
    const c = state.card;
    const l = displayLines(c.path).find((x) => x.n === c.n);
    if (!l || !l.origin) return '';
    const h = l.hunk ? HUNKS[l.hunk] : null;
    let who = '';
    let rows = [];
    let acts = `<button type="button" class="btn btn-sm" data-action="view-diff" data-arg="${c.path}">View diff</button>`;
    if (l.origin === 'ai') {
      who = `${G.ai} Claude · token-refresh`;
      rows = [['Change', h.what], ['Turn', `${h.turn} · ${h.tool}`], ['Time', `today ${h.time}`], ['Confidence', state.settings.precise ? 'Certain (hook events)' : 'Likely (files watched while the CLI ran)']];
      if (!h.noRevert) acts += `<button type="button" class="btn btn-sm btn-quiet" data-action="revert" data-arg="${l.hunk}">Revert this change</button>`;
    } else if (l.origin === 'aiyou') {
      who = `${G.ai}${G.you} Claude, then you`;
      rows = [['Written', `turn ${h.turn} · ${h.tool} · ${h.time}`], ['Edited', 'by you · 10:47 · added { retries: 1 }'], ['Confidence', state.settings.precise ? 'Certain' : 'Agent part likely, your edit certain']];
      acts += `<button type="button" class="btn btn-sm btn-quiet" data-action="revert" data-arg="${l.hunk}">Revert agent part</button>`;
    } else if (l.origin === 'you0') {
      who = `${G.you} You`;
      rows = [['When', 'before this session (uncommitted)'], ['Layer', 'Your earlier changes'], ['Confidence', 'Certain (saved in Studio)']];
    } else {
      who = `${G.you} You`;
      rows = [['When', 'during this session · 10:44'], ['Confidence', 'Certain (saved in Studio)']];
    }
    return `<div class="hovercard" role="dialog" aria-label="Line ${l.n} details" style="top:${c.top}px;left:${c.left}px">
      <div class="who">${who}<span class="spacer"></span><button type="button" class="ibtn" aria-label="Close" data-action="card-close">${I('close', 'sm')}</button></div>
      <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      <div class="row">${acts}</div></div>`;
  }

  /* ---------------------------- Mission Control ---------------------------- */
  function missionColumns() {
    const needs = [];
    const working = [];
    const review = [];
    const done = [];
    if (state.tokenStopped) done.push('token-stopped'); else working.push('token');
    (state.approval ? working : needs).push('checkout');
    (state.answer ? working : needs).push('docs');
    if (state.delegated) working.push('new');
    if (state.review.applied) done.unshift('rate-applied'); else review.push('rate');
    done.push('flaky', 'explain');
    return [
      { title: 'Needs you', color: 'var(--warning)', cards: needs, empty: 'Nothing needs you right now.' },
      { title: 'Working', color: 'var(--actor-ai)', cards: working, empty: 'No agents are working.' },
      { title: 'Review ready', color: 'var(--success)', cards: review, empty: 'Nothing to review.' },
      { title: 'Done today', color: 'var(--text-secondary)', cards: done, empty: 'Nothing finished yet today.' }
    ];
  }
  function planBar(doneN, total, h) {
    let s = '';
    for (let i = 0; i < total; i++) s += `<span style="${i < doneN ? 'background:' + h : ''}"></span>`;
    return `<div class="row" style="gap:8px"><div class="plan" role="img" aria-label="Plan: ${doneN} of ${total} steps done">${s}</div><span class="muted small">plan ${doneN}/${total}</span></div>`;
  }
  function cardShell(o, body) {
    return `<article class="card${o.attn ? ' attn' : ''}${o.isNew ? ' new' : ''}" aria-label="${esc(o.name)}, ${esc(o.state)}">
      <div class="chead">${hue(o.hue)}<span class="name">${esc(o.name)}</span><span class="badge">${esc(o.mode)}</span><span class="badge soft">${esc(o.trust)}</span><span class="spacer"></span><span class="muted small">${esc(o.age)}</span></div>
      <div class="soft small">${esc(o.title)}</div>${body}</article>`;
  }
  function missionCard(id) {
    const working = (step, h) => `<div class="step"><span class="dot pulse" style="background:${h}" aria-hidden="true"></span><span>${esc(step)}</span></div>`;
    if (id === 'token') {
      return cardShell({ name: 'token-refresh', hue: 'var(--hue-violet)', mode: 'IN PLACE · TERMINAL 2', trust: 'Pair', age: '6 min', state: state.paused ? 'paused' : 'working', title: 'Silent token refresh 60 s before expiry' },
        `${working(state.paused ? 'Paused before its next tool call' : 'Editing src/auth/session.ts · scheduleRefresh()', 'var(--hue-violet)')}${planBar(3, 5, 'var(--hue-violet)')}<div class="soft small">${esc(tokenStats())}</div>
        <div class="row"><button type="button" class="btn" data-action="console-open" data-arg="token-refresh">Open console</button><button type="button" class="btn" data-action="tab" data-arg="changes">AI Changes</button><button type="button" class="btn btn-quiet" data-action="pause">${state.paused ? 'Resume' : 'Pause'}</button><button type="button" class="btn btn-danger" data-action="interrupt">Interrupt</button></div>`);
    }
    if (id === 'token-stopped') {
      return cardShell({ name: 'token-refresh', hue: 'var(--hue-violet)', mode: 'IN PLACE', trust: 'Pair', age: 'just now', state: 'stopped', title: 'Silent token refresh 60 s before expiry' },
        `<div class="soft small">Stopped by you. Its changes stay in AI Changes: ${esc(tokenStats())}.</div><div class="row"><button type="button" class="btn" data-action="tab" data-arg="changes">AI Changes</button><button type="button" class="btn btn-quiet" data-action="resume-token">Resume session</button></div>`);
    }
    if (id === 'checkout') {
      const o = { name: 'checkout-tests', hue: 'var(--hue-pink)', mode: 'WORKTREE', trust: 'Propose', age: '11 min', title: 'Integration tests for checkout with a mocked payments gateway' };
      if (!state.approval) {
        return cardShell(Object.assign(o, { attn: true, state: 'needs approval' }),
          `<div class="small">Wants to run a command</div><code class="cmd">npm install --save-dev msw@2</code><div class="soft small">Why: “MSW mocks the payments gateway in the new tests.”</div>
          <div class="risk"><span class="dot" style="background:var(--warning)" aria-hidden="true"></span>Medium risk · installs packages · network access</div>
          <div class="row"><button type="button" class="btn" data-action="decide" data-arg="denied">Deny</button><button type="button" class="btn btn-primary" data-action="decide" data-arg="once">Allow once</button><button type="button" class="btn" data-action="decide" data-arg="session">Allow for this session</button></div>`);
      }
      const note = { once: state.remember ? 'You allowed it and remembered the rule for this project.' : 'You allowed npm install --save-dev msw@2 once.', session: 'You allowed npm install --save-dev * for this session.', denied: 'You denied the install. The agent was told and is taking another approach.' }[state.approval];
      return cardShell(Object.assign(o, { state: 'working' }),
        `${working(state.approval === 'denied' ? 'Writing a hand-rolled fetch stub instead' : 'Running npm install --save-dev msw@2', 'var(--hue-pink)')}${planBar(2, 5, 'var(--hue-pink)')}<div class="soft small">1 file · +88 · tests not run yet</div><div class="note">${esc(note)}</div>`);
    }
    if (id === 'docs') {
      const o = { name: 'api-docs', hue: 'var(--hue-cyan)', mode: 'WORKTREE', trust: 'Propose', age: '4 min', title: 'Document the v2 REST endpoints in openapi.yaml' };
      if (!state.answer) {
        return cardShell(Object.assign(o, { attn: true, state: 'asking a question' }),
          `<div class="small">Asks: should the docs also cover the deprecated v1 endpoints?</div>
          <div class="row"><button type="button" class="btn" data-action="answer" data-arg="Yes, briefly">Yes, briefly</button><button type="button" class="btn" data-action="answer" data-arg="No, v2 only">No, v2 only</button><button type="button" class="linkbtn" data-action="attention-open" data-arg="question">Answer…</button></div>
          <div class="muted small">The agent is waiting. Your answer goes back to it as the tool result.</div>`);
      }
      return cardShell(Object.assign(o, { state: 'working' }),
        `${working('Writing paths for /v2/sessions', 'var(--hue-cyan)')}${planBar(1, 4, 'var(--hue-cyan)')}<div class="soft small">1 file · +64 −2</div><div class="note">You answered: “${esc(state.answer)}”.</div>`);
    }
    if (id === 'new') {
      const d = state.delegated;
      return cardShell({ name: d.name, hue: 'var(--hue-orange)', mode: d.mode, trust: d.trust, age: 'just now', state: 'starting', title: d.title, isNew: true },
        `${working(d.where === 'worktree' ? 'Starting: making a worktree from your current files' : d.where === 'terminal' ? 'Starting Claude CLI in Terminal 3' : 'Starting in your working tree', 'var(--hue-orange)')}<div class="row"><button type="button" class="btn" data-action="console-open" data-arg="token-refresh">Open console</button></div>`);
    }
    if (id === 'rate') {
      return cardShell({ name: 'rate-limit', hue: 'var(--hue-lime)', mode: 'WORKTREE', trust: 'Propose', age: '18 min', state: 'ready for review', title: 'Token-bucket rate limiting for /api routes' },
        `<div class="small">5 files · <span class="plus">+20</span> <span class="minus">−3</span> · 7 hunks</div><div class="small" style="color:var(--success)">✓ Done when: “test” passes (48 passed)</div>
        <div class="row"><button type="button" class="btn btn-primary" data-action="tab" data-arg="review">Review</button><button type="button" class="btn btn-quiet" data-action="toast" data-arg="Studio asks before discarding: the worktree and its branch are removed, and nothing touches your files.">Discard worktree</button></div>`);
    }
    if (id === 'rate-applied') {
      return cardShell({ name: 'rate-limit', hue: 'var(--hue-lime)', mode: 'WORKTREE', trust: 'Propose', age: 'just now', state: 'applied', title: 'Token-bucket rate limiting for /api routes' },
        `<div class="soft small">You applied ${state.review.applied} of 7 hunks to your working tree. Rejected hunks were discarded and the worktree was removed.</div>`);
    }
    if (id === 'flaky') return cardShell({ name: 'fix-flaky-login', hue: 'var(--hue-orange)', mode: 'WORKTREE', trust: 'Propose', age: '09:42', state: 'done', title: 'Stabilize the login end-to-end test' }, '<div class="soft small">4 of 4 hunks accepted · committed as “test: wait for the session cookie”</div>');
    return cardShell({ name: 'explain-cache', hue: 'var(--hue-violet)', mode: 'OBSERVE', trust: 'Observe', age: '08:15', state: 'done', title: 'Explain how the price cache invalidates' }, '<div class="soft small">Answered in the console · no files changed</div>');
  }
  function missionView() {
    const s = agentsSummary();
    const chips = [['var(--actor-ai)', `${s.running} agents running`], ['var(--warning)', `${s.need} need you`], ['var(--success)', state.review.applied ? '0 ready for review' : '1 ready for review'], ['var(--actor-studio)', `${state.delegated && state.delegated.where === 'worktree' ? 4 : 3} worktrees · 1 in place`]];
    const cols = missionColumns().map((c) => `<section class="col" aria-label="${c.title}"><h3 class="colhead" style="color:${c.color}">${c.title}<span class="num">${c.cards.length}</span></h3>${c.cards.length ? c.cards.map(missionCard).join('') : `<div class="empty">${c.empty}</div>`}</section>`).join('');
    return `<div class="mview" data-scroll="mission"><div class="mtop"><h2>Mission Control</h2><span class="muted small">payments-api</span><span class="spacer"></span><div class="seg" role="group" aria-label="View"><button type="button" aria-pressed="true">Board</button><button type="button" aria-pressed="false" data-action="toast" data-arg="List view: one row per session, sortable by state, age, and changes.">List</button></div><button type="button" class="btn btn-primary" data-action="overlay" data-arg="delegate">${I('sparkle', 'md')} Delegate</button></div>
      <div class="summary-chips" role="status">${chips.map(([c, t]) => `<span class="sc"><span class="dot" style="background:${c}" aria-hidden="true"></span>${t}</span>`).join('')}</div>
      <div class="board">${cols}</div></div>`;
  }

  /* ------------------------------ AI Changes ------------------------------ */
  function diffLine(l) {
    const cls = l[0] === '+' ? 'add' : l[0] === '−' ? 'del' : '';
    const aiyou = l[3] === 'aiyou';
    return `<div class="dl ${cls}${aiyou ? ' aiyou' : ''}"><span class="no">${l[1]}</span><span class="sg">${l[0] === ' ' ? '' : l[0]}</span><span class="tx">${highlight(l[2])}</span>${aiyou ? '<span class="why">● then edited by you</span>' : ''}</div>`;
  }
  function changeHunk(id) {
    const d = DIFFS[id];
    let head;
    let acts = '';
    if (d.origin === 'ai') {
      const h = HUNKS[id];
      head = `${G.ai}<strong>Claude · token-refresh</strong><span class="soft">turn ${h.turn} · ${h.tool} · ${esc(d.range)}</span>${h.live ? '<span class="tag-ai">live</span>' : ''}`;
      acts = `<span class="spacer"></span>${state.reviewed[id] ? `<span class="state-ok">Reviewed</span><button type="button" class="btn btn-sm btn-quiet" data-action="unreview" data-arg="${id}">Undo</button>` : `<button type="button" class="btn btn-sm" data-action="reviewed" data-arg="${id}">Mark reviewed</button>`}${h.noRevert ? '' : `<button type="button" class="btn btn-sm btn-quiet" data-action="revert" data-arg="${id}">Revert</button>`}`;
    } else if (d.origin === 'you') {
      head = `${G.you}<strong>You</strong><span class="soft">${esc(d.note)} · ${esc(d.range)}</span>`;
    } else {
      head = `${G.you}<strong>You, before this session</strong><span class="soft">${esc(d.range)} · uncommitted</span>`;
    }
    return `<article class="hunk" aria-label="${esc(d.file)} ${esc(d.range)}"><div class="hhead">${head}${acts}</div><div class="diff">${d.lines.map(diffLine).join('')}</div></article>`;
  }
  function changesView() {
    const ch = state.changes;
    const sessions = CHANGE_SESSIONS.map((s) => `<button type="button" class="agentrow" aria-current="${ch.session === s.id}" style="${ch.session === s.id ? 'background:var(--surface-selected)' : ''}" data-action="changes-session" data-arg="${s.id}">${hue(s.hue)}<span class="grow"><span>${s.id}</span><span class="st">${s.place}</span></span></button>`).join('');
    const left = `<aside class="csess" aria-label="Agent sessions"><div class="lbl">Agent sessions</div>${sessions}</aside>`;
    if (ch.session !== 'token-refresh') {
      const s = CHANGE_SESSIONS.find((x) => x.id === ch.session);
      return `<div class="cview">${left}<section class="cmain"><div class="cbar"><h2>AI Changes · ${s.id}</h2></div><div class="cdiffs"><div class="stepcard">${esc(s.summary)}</div>${s.go ? `<div><button type="button" class="btn btn-primary" data-action="tab" data-arg="${s.go}">Open in Review Inbox</button></div>` : ''}</div></section></div>`;
    }
    const step = ch.step ? STEPS.find((s) => s.id === ch.step) : null;
    const stepMode = step && step.hunks ? 'ai' : undefined;
    const filesAll = changeFiles({ step: step && step.hunks ? ch.step : null, mode: stepMode });
    const fileSel = ch.file && filesAll.some((f) => f.file === ch.file) ? ch.file : null;
    let diffs;
    if (step && !step.hunks) {
      diffs = `<div class="stepcard">${step.kind === 'turn' ? `<strong>You asked (turn ${step.turn}):</strong> “${esc(step.prompt)}”` : `<strong>${esc(step.label)}</strong><br>${esc(step.note)}`}</div>`;
    } else {
      const ids = visibleDiffs({ step: step ? step.id : null, file: fileSel, mode: stepMode });
      diffs = ids.length ? ids.map(changeHunk).join('') : '<div class="stepcard">No changes match this view.</div>';
    }
    const earlier = state.mode !== 'all' && state.since !== 2
      ? `<button type="button" class="frow dim" style="border:1px dashed #4A4A55;border-radius:6px" data-action="earlier-toggle" aria-expanded="${ch.earlier}">${G.you}<span class="name">Your earlier changes (before this session)</span><span class="small">${ch.earlier ? 'hide' : '1 file'}</span></button>` : '';
    const earlierDiffs = ch.earlier && state.mode !== 'all' ? `<div class="stack" style="gap:12px"><div class="muted small">Layer 1 · your uncommitted edits from before token-refresh started. Never shown as the agent's.</div>${['E0a', 'E0b'].map(changeHunk).join('')}</div>` : '';
    const files = `<div class="flist">${filesAll.length ? filesAll.map((f) => `<button type="button" class="frow${fileSel === f.file ? ' sel' : ''}" data-action="changes-file" data-arg="${f.file}"><span class="name">${esc(f.file)}</span>${glyphs(f.g)}<span class="plus">+${f.plus}</span>${f.minus ? `<span class="minus">−${f.minus}</span>` : ''}</button>`).join('') : '<div class="frow dim">No files</div>'}</div>`;
    const stepInfo = step ? `<span>${step.kind === 'turn' ? `Turn ${step.turn}` : `Turn ${step.turn} · ${esc(step.label)}${step.delta ? ' ' + step.delta : ''}`}</span><button type="button" class="linkbtn" data-action="step" data-arg="${step.id}">Show all steps</button>` : '<span>Select a tick to see one step’s change. Diamonds are edits, squares are commands, circles are reads.</span>';
    return `<div class="cview">${left}<section class="cmain">
      <div class="cbar"><h2>AI Changes · token-refresh</h2>${modeSeg()}<button type="button" class="tbtn" data-action="since"><span>Since: <strong>${SINCE[state.since]}</strong></span>${I('chevronDown', 'sm')}</button><span class="spacer"></span><span class="soft small" role="status">${esc(summaryText())}</span><button type="button" class="btn" data-action="revert-session">Revert session…</button></div>
      <div class="ctl">${timeline(true)}<div class="stepinfo">${stepInfo}</div></div>
      <div class="cbody"><div class="cfiles">${files}${earlier}</div><div class="cdiffs" data-scroll="changes-diffs">${diffs}${earlierDiffs}</div></div>
    </section></div>`;
  }

  /* ----------------------------- Review Inbox ----------------------------- */
  function reviewView() {
    const r = state.review;
    const file = REVIEW_FILES.find((f) => f.id === r.sel);
    const acc = reviewAccepted();
    const decided = reviewDecidedCount();
    const files = REVIEW_FILES.map((f) => {
      const n = f.hunks.length;
      const d = f.hunks.filter((h) => reviewDecided(h.id)).length;
      const conflict = f.hunks.some((h) => h.conflict && !reviewDecided(h.id));
      const glyph = conflict ? '!' : d === n ? '✓' : d ? '◐' : '○';
      const color = conflict ? 'var(--warning)' : d === n ? 'var(--success)' : 'var(--text-secondary)';
      return `<button type="button" class="rfile" aria-current="${f.id === r.sel}" data-action="review-file" data-arg="${f.id}"><span aria-hidden="true" style="width:12px;color:${color}">${glyph}</span><span class="name" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}</span><span class="muted small">${d}/${n}</span></button>`;
    }).join('');
    let adds = 0;
    let dels = 0;
    file.hunks.forEach((h) => h.lines.forEach((l) => { if (l[0] === '+') adds++; if (l[0] === '−') dels++; }));
    const hunks = file.hunks.map((h, i) => {
      const st = r.dec[h.id];
      const focus = i === r.focus;
      let right;
      if (!st) {
        right = `${h.conflict ? `<button type="button" class="btn btn-sm btn-warn" data-action="hunk" data-arg="${h.id}|resolved">Resolve…</button>` : `<button type="button" class="btn btn-sm btn-accept" data-action="hunk" data-arg="${h.id}|accepted">Accept</button>`}<button type="button" class="btn btn-sm" data-action="hunk" data-arg="${h.id}|rejected">Reject</button>`;
      } else {
        const text = r.applied && (st === 'accepted' || st === 'resolved') ? 'Applied' : { accepted: 'Accepted', rejected: 'Rejected', resolved: 'Resolved and accepted' }[st];
        right = `<span class="${st === 'rejected' ? 'state-no' : 'state-ok'}">${text}</span>${r.applied ? '' : `<button type="button" class="btn btn-sm btn-quiet" data-action="hunk" data-arg="${h.id}|">Undo</button>`}`;
      }
      let body = '';
      if (st !== 'rejected') {
        if (r.view === 'unified') body = `<div class="diff">${h.lines.map(diffLine).join('')}</div>`;
        else body = `<div class="diff">${splitRows(h.lines)}</div>`;
        if (h.conflict) body += '<div class="hfoot">You changed line 41 after the agent started. Resolve opens a 3-way merge (yours · baseline · agent); nothing is written until you finish it.</div>';
      }
      return `<article class="hunk${h.conflict && !st ? ' conflict' : ''}${focus ? ' kfocus' : ''}" aria-label="Hunk from turn ${h.turn}, ${h.range}${st ? ', ' + st : ', not decided'}">
        <div class="hhead${st === 'rejected' ? ' rejected' : ''}">${G.ai}<strong>Claude · rate-limit</strong><span class="soft">turn ${h.turn} · Edit · ${h.range}</span><span class="muted">certain</span>${h.conflict && !st ? '<span class="tag-warn">Overlaps your uncommitted edit</span>' : ''}<span class="spacer"></span>${right}</div>${body}</article>`;
    }).join('');
    return `<div class="rview">
      <div class="rhead"><div class="ttl"><h2>${hue('var(--hue-lime)')} Review: rate-limit</h2><div class="sub">Worktree · Claude CLI · Propose · baseline is HEAD plus your uncommitted changes · <span style="color:var(--success)">✓ test passed (48)</span></div></div>
        <span class="soft small" role="status">${decided} of 7 hunks decided · ${acc} accepted</span>
        <div class="seg" role="group" aria-label="Diff layout">${[['unified', 'Unified'], ['split', 'Split']].map(([id, l]) => `<button type="button" aria-pressed="${r.view === id}" data-action="review-view" data-arg="${id}">${l}</button>`).join('')}</div>
        <button type="button" class="btn btn-primary btn-lg" data-action="review-apply" ${acc && !r.applied ? '' : 'disabled'}>${r.applied ? 'Applied' : `Apply ${acc} accepted`} <kbd>⌘↩</kbd></button></div>
      ${r.applied ? `<div class="banner ok" role="status"><span style="color:var(--success)">✓</span><span class="grow">Applied ${r.applied} hunks to your working tree with a 3-way merge. A safety checkpoint was saved first, and your uncommitted edits were kept.</span><button type="button" class="btn btn-sm" data-action="review-undo">Undo</button></div>` : ''}
      <div class="rbody"><nav class="rfiles" aria-label="Files"><div class="lbl">Files</div>${files}<div class="rkeys"><strong style="color:var(--text-primary)">Keyboard</strong><br><kbd>J</kbd> <kbd>K</kbd> next, previous hunk<br><kbd>A</kbd> accept · <kbd>X</kbd> reject<br><kbd>⇧A</kbd> <kbd>⇧X</kbd> whole file<br><kbd>⌘↩</kbd> apply accepted</div></nav>
        <section class="rmain" data-scroll="review" aria-label="Hunks"><div class="row"><h3 class="mono" style="font-size:13px">${esc(file.name)}</h3><span class="muted small">${file.note ? esc(file.note) + ' · ' : ''}+${adds} −${dels} · ${file.hunks.length} ${file.hunks.length === 1 ? 'hunk' : 'hunks'}</span><span class="spacer"></span><button type="button" class="btn btn-sm" data-action="review-file-all" data-arg="accepted">Accept remaining in file</button><button type="button" class="btn btn-sm btn-quiet" data-action="review-file-all" data-arg="rejected">Reject remaining</button></div>${hunks}</section></div>
    </div>`;
  }
  function splitRows(lines) {
    const rows = [];
    let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (l[0] === ' ') { rows.push([l[2], l[2], '', '']); i++; continue; }
      const dels = [];
      const adds = [];
      while (i < lines.length && lines[i][0] === '−') { dels.push(lines[i][2]); i++; }
      while (i < lines.length && lines[i][0] === '+') { adds.push(lines[i][2]); i++; }
      for (let k = 0; k < Math.max(dels.length, adds.length); k++) rows.push([k < dels.length ? dels[k] : null, k < adds.length ? adds[k] : null, k < dels.length ? 'del' : 'none', k < adds.length ? 'add' : 'none']);
    }
    return rows.map(([lt, rt, lc, rc]) => {
      const lcls = lc || '';
      const rcls = rc || '';
      return `<div class="split"><div class="side l ${lcls}"><span class="sg">${lc === 'del' ? '−' : ''}</span><span class="tx">${lt == null ? '' : highlight(lt)}</span></div><div class="side ${rcls}"><span class="sg">${rc === 'add' ? '+' : ''}</span><span class="tx">${rt == null ? '' : highlight(rt)}</span></div></div>`;
    }).join('');
  }

  /* -------------------------------- Lesson -------------------------------- */
  function lessonView() {
    const L = state.lesson;
    const code = [
      'export async function retryOnce<T>(fetchData: () => Promise<T>, retries = 1): Promise<T> {',
      '  let lastError: unknown',
      L.fixed ? '  for (let attempt = 0; attempt <= retries; attempt++) {' : '  for (let attempt = 0; attempt <= retries + 1; attempt++) {',
      '    try {',
      '      return await fetchData()',
      '    } catch (err) {',
      '      lastError = err',
      '    }',
      '  }',
      '  throw lastError',
      '}'
    ];
    const lines = code.map((t, i) => {
      const fixme = i === 2 && !L.fixed;
      const inner = `<span class="ln">${i + 1}</span><span class="gut${i === 2 && L.fixed ? ' m-you' : ''}" aria-hidden="true"></span><span class="src">${highlight(t)}</span>`;
      return fixme ? `<button type="button" class="cl fixme" style="width:100%;border:0;background:transparent;text-align:left;font:inherit;color:inherit;padding:0" data-action="lesson-fix" aria-label="Line 3. Click to edit this line yourself: make the loop stop at retries">${inner}</button>` : `<div class="cl">${inner}</div>`;
    }).join('');
    let result = '';
    if (L.result === 'fail') result = '<div class="result no" role="status">✕ 1 of 3 checks failed: with retries = 1, fetchData was called 3 times (expected 2).</div>';
    if (L.result === 'pass') result = '<div class="result ok" role="status">✓ 3 of 3 checks passed. Lesson 4 complete; a flashcard was added to your deck.</div>';
    return `<div class="lesson">
      <article class="read"><span class="muted small">TypeScript async · lesson 4 of 8</span><h2>Retrying async calls</h2>
        <p>A retry should run the operation at most <code>retries + 1</code> times: the first attempt plus each retry. Off-by-one loops are the most common bug here.</p>
        <p>Only retry failures that can succeed later, like a 503. Retrying a 400 just repeats the same mistake.</p>
        <p><strong style="color:var(--text-primary)">Exercise.</strong> Make <code>retryOnce()</code> call <code>fetchData</code> at most twice when <code>retries</code> is 1. The check runs the exercise’s own tests.</p>
        <div class="banner round ai">${G.ai}<span class="grow">The tutor uses the Observe profile: it explains, hints, and reviews your code. It does not edit files or write the solution unless you ask.</span></div>
      </article>
      <section class="work" aria-label="Exercise"><div class="crumbs"><span>exercise</span><span aria-hidden="true">›</span><span class="cur">retry.ts</span><span class="spacer"></span><span class="muted small">a worktree made for this lesson</span></div>
        <div class="excode">${lines}</div>
        <div class="wpane"><div class="row"><button type="button" class="btn btn-primary" data-action="lesson-check">Check</button><button type="button" class="btn" data-action="lesson-hint">Ask tutor for a hint</button>${L.fixed ? '' : '<span class="muted small">Tip: the highlighted line is the one to change. Click it to make the edit.</span>'}</div>${result}</div>
      </section></div>`;
  }

  /* ----------------------------- Bottom panel ----------------------------- */
  function bottomPanel() {
    const B = state.ui.bottom;
    const tabs = [['term1', 'Terminal 1'], ['term2', 'Terminal 2 · claude', true], ['console', 'Agent Console', true], ['problems', 'Problems', false, 2], ['run', 'Run']];
    const tabBtns = tabs.map(([id, l, ag, ct]) => `<button type="button" role="tab" class="tab" aria-selected="${B === id}" data-action="bottom-tab" data-arg="${id}">${ag ? G.ai : ''}${l}${ct ? `<span class="ctr">${ct}</span>` : ''}</button>`).join('');
    const content = { term1: term1, term2: term2, console: consoleView, problems: problemsView, run: runView }[B]();
    return `<section class="bottom" aria-label="Bottom tool window"><div class="grip-y" data-grip="bottom" aria-hidden="true"></div>
      <div class="btabs" role="tablist" aria-label="Bottom tool windows">${tabBtns}<span class="end"><button type="button" class="ibtn" aria-label="Hide bottom tool window" data-action="bottom" data-arg="${B}">${I('close', 'sm')}</button></span></div>
      <div class="pbody" data-scroll="bottom:${B}">${content}</div></section>`;
  }
  function term1() {
    return `<div class="term"><div><span class="prompt">~/src/payments-api</span> <span class="muted">feat/token-refresh</span> $ npm run dev</div><div class="soft">payments-api listening on http://localhost:4000</div><div class="soft">GET /health 200 2ms</div></div>`;
  }
  function term2() {
    const tail = state.tokenStopped
      ? '<div style="color:var(--danger)">^C Interrupted from Studio. The session ended; its changes stay in AI Changes.</div>'
      : state.paused
        ? '<div class="muted">Paused by Studio before the next tool call.</div>'
        : '<div><span class="g-ai">●</span> Edit src/auth/session.ts <span class="plus">+4</span> <span class="muted">editing scheduleRefresh()</span><span class="cursor-block" aria-hidden="true"></span></div>';
    const banner = state.settings.precise
      ? `<div class="banner ai" role="status">${G.ai}<span class="grow">Tracking Claude CLI in Terminal 2 · you started it, Studio detected it · hooks: certain, every tool call is checkpointed</span><button type="button" class="linkbtn" data-action="tab" data-arg="changes">AI Changes</button><button type="button" class="linkbtn" data-action="settings-open" data-arg="agents">Tracking settings</button></div>`
      : `<div class="banner warn" role="status"><span class="g-ext" aria-hidden="true">▲</span><span class="grow">Tracking Claude CLI in Terminal 2 · you started it, Studio detected it · watching files: changes are marked likely</span><button type="button" class="linkbtn" data-action="settings-open" data-arg="agents">Make tracking precise</button></div>`;
    return `${banner}
      <div class="term">
        <div><span class="prompt">~/src/payments-api</span> <span class="muted">feat/token-refresh</span> $ claude</div>
        <div class="soft">&gt; Add a silent token refresh 60 s before expiry. Keep the public API of session.ts unchanged.</div>
        <div><span class="g-ai">●</span> Read src/auth/session.ts</div><div><span class="g-ai">●</span> Read src/auth/tokens.ts</div>
        <div><span class="g-ai">●</span> Edit src/auth/session.ts <span class="plus">+7</span></div>
        <div><span class="g-ai">●</span> Bash npm test -- session <span style="color:var(--success)">✓ 12 passed</span></div>
        <div class="soft">&gt; Retry token rotation once when the server returns 503.</div>
        <div><span class="g-ai">●</span> Edit src/auth/tokens.ts <span class="plus">+8</span> <span class="minus">−4</span></div>
        <div><span class="g-ai">●</span> Bash npm test <span style="color:var(--success)">✓ 14 passed</span></div>
        <div class="soft">&gt; Schedule the refresh automatically and add a test.</div>
        <div><span class="g-ai">●</span> Write tests/session.test.ts <span class="plus">+9</span></div>
        ${tail}
      </div>`;
  }
  function consoleView() {
    const sess = state.consoleSession;
    const tool = (key, label, detail, link) => `<div class="toolrow"><button type="button" aria-expanded="${!!state.expanded[key]}" data-action="expand" data-arg="${key}">${state.expanded[key] ? '▾' : '▸'} ${esc(label)}</button>${state.expanded[key] ? `<pre>${esc(detail)}</pre>` : ''}${link || ''}</div>`;
    let msgs;
    if (sess === 'tutor') {
      msgs = `<div class="msg"><strong class="g-ai">◆ tutor</strong><span class="soft">Welcome to “Retrying async calls”. Try the exercise first; ask me for a hint any time. I won’t write the solution unless you ask.</span></div>
        ${state.lesson.result ? '<div class="msg"><strong class="g-ai">◆ tutor</strong><span class="soft">' + (state.lesson.result === 'pass' ? 'Nice: attempts = retries + 1 is exactly right now. Want a flashcard for the off-by-one rule? I added one.' : 'The check says fetchData ran three times. Look at the loop’s upper bound.') + '</span></div>' : ''}
        ${state.lesson.hint ? '<div class="msg"><strong class="g-ai">◆ tutor</strong><span class="soft">Hint: with retries = 1, the loop runs for attempt 0, 1, and 2. How many attempts do you actually want?</span></div>' : ''}`;
    } else {
      msgs = `<div class="msg"><strong class="g-you">You</strong><span class="soft">Add a silent token refresh 60 s before expiry. Keep the public API of session.ts unchanged.</span></div>
        <div class="msg"><strong class="g-ai">◆ Claude</strong>I’ll read session.ts and tokens.ts first.</div>
        ${tool('r1', 'Read src/auth/session.ts (27 lines)', 'Read 27 lines. Reads change nothing; they show where the agent looked.')}
        ${tool('r2', 'Read src/auth/tokens.ts (20 lines)', 'Read 20 lines.')}
        ${tool('e1', 'Edit src/auth/session.ts  +7', '+ export async function refreshIfNeeded(s: Session, now = Date.now()) {\n+   const msLeft = s.expiresAt - now\n+   if (msLeft > REFRESH_WINDOW) return s\n…', '<button type="button" class="linkbtn" style="margin-left:16px;font-size:12px" data-action="step-open" data-arg="t1e1">View diff</button>')}
        ${tool('b1', 'Bash npm test -- session  (exit 0, 2.1 s)', 'PASS  tests/session.test.ts\n  12 passed')}
        <div class="msg planrow"><strong class="g-ai">◆ Plan</strong><span style="color:var(--success)">✓ find expiry handling</span><span style="color:var(--success)">✓ add refreshIfNeeded</span><span style="color:var(--success)">✓ retry rotation once</span><span>◻ schedule refresh</span><span class="soft">◻ test it</span></div>
        <div class="msg"><strong class="g-you">You</strong><span class="soft">Retry token rotation once when the server returns 503.</span></div>
        <div class="msg"><strong class="g-ai">◆ Claude</strong>Added a retry loop in rotate(); only 503 retries. Tests pass (14).</div>
        <div class="msg"><strong class="g-you">You</strong><span class="soft">Schedule the refresh automatically and add a test.</span></div>
        <div class="msg"><strong class="g-ai">◆ Claude</strong>Writing the test first, then scheduleRefresh().</div>
        ${tool('w1', 'Write tests/session.test.ts  +9', 'New file, 9 lines.')}
        ${tool('e2', state.tokenStopped ? 'Edit src/auth/session.ts  +4  (interrupted)' : 'Edit src/auth/session.ts  +4  (running)', 'scheduleRefresh(s, onNext)')}`;
    }
    const extra = state.consoleExtra[sess].map((m) => `<div class="msg"><strong class="${m.who === 'you' ? 'g-you' : 'g-ai'}">${m.who === 'you' ? 'You' : sess === 'tutor' ? '◆ tutor' : '◆ Claude'}</strong><span class="${m.who === 'you' ? 'soft' : ''}">${esc(m.text)}</span></div>`).join('');
    const canSend = sess === 'tutor' || !state.tokenStopped;
    return `<div class="console"><div class="msgs" data-scroll="console:${sess}" aria-live="polite">
        <div class="row small muted" style="justify-content:space-between"><span>${G.ai} ${sess === 'tutor' ? 'tutor · Observe · lesson worktree' : 'Claude · token-refresh · Pair · in place'}</span><button type="button" class="linkbtn small" data-action="console-switch">Switch session</button></div>
        ${msgs}${extra}</div>
      <div class="composer"><label class="vh" for="console-input">Message the agent</label><input id="console-input" class="input" data-input="console" data-fkey="console" placeholder="${canSend ? 'Message the agent…' : 'This session has ended'}" value="${esc(state.consoleDraft)}" ${canSend ? '' : 'disabled'}><button type="button" class="btn btn-primary" data-action="console-send" ${canSend ? '' : 'disabled'}>Send</button></div></div>`;
  }
  function problemsView() {
    return `<button type="button" class="problem" style="width:100%;border:0;border-bottom:1px solid var(--line-hairline);background:transparent;color:inherit;text-align:left;cursor:pointer" data-action="open" data-arg="src/routes/checkout.ts"><span style="color:var(--warning)">▲ warning</span><span>src/routes/checkout.ts:9</span><span class="soft">'token' is possibly 'undefined'. (TS18048)</span></button>
      <button type="button" class="problem" style="width:100%;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer" data-action="open" data-arg="tests/session.test.ts"><span style="color:var(--warning)">▲ warning</span><span>tests/session.test.ts:1</span><span class="soft">'vi' is declared but its value is never read. (TS6133)</span></button>`;
  }
  function runView() {
    if (!state.ran) return '<div class="pad soft">No run yet. Press Run in the toolbar to start “test”.</div>';
    return '<div class="term"><div class="muted">$ npm test</div><div>PASS tests/session.test.ts</div><div>PASS tests/checkout.test.ts</div><div style="color:var(--success)">✓ 14 passed · 2.3 s</div></div>';
  }

  /* ------------------------------ Status bar ------------------------------ */
  function statusbar() {
    const s = agentsSummary();
    const t = state.ui.tab;
    const pos = t.startsWith('file:') ? FILES[t.slice(5)].cursor : '';
    return `<footer class="statusbar"><span>⎇ feat/token-refresh</span><span><span style="color:var(--success)">✓</span> TypeScript</span>
      <button type="button" data-action="tab" data-arg="mission">${G.ai} ${s.running} agents${s.need ? ` <span style="color:var(--warning)">(${s.need} need you)</span>` : ''}</button>
      <button type="button" data-action="tab" data-arg="changes">${unreviewedCount()} AI hunks unreviewed</button>
      <span class="spacer"></span><span>UTF-8</span><span>LF</span>${pos ? `<span>${pos}</span>` : ''}</footer>`;
  }

  /* ------------------------------- Overlays ------------------------------- */
  function overlay() {
    const o = state.ui.overlay;
    if (!o) return '';
    if (o === 'attention') return `<div class="scrim clear" data-action="overlay-close"></div>${attentionPopover()}`;
    if (o === 'delegate') return `<div class="scrim" data-action="overlay-close"></div>${delegateSheet()}`;
    if (o === 'search') return `<div class="scrim full" data-action="overlay-close"></div>${searchPalette()}`;
    if (o === 'settings') return `<div class="scrim full" data-action="overlay-close"></div>${settingsModal()}`;
    return '';
  }

  function attentionPopover() {
    const items = attentionItems();
    const sel = state.ui.attention;
    const list = items.map((it) => `<button type="button" class="arow${it.done ? ' done' : ''}" aria-current="${sel === it.id}" data-action="att-sel" data-arg="${it.id}">${hue(it.done ? 'var(--text-disabled)' : it.hue)}<span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px"><span class="row" style="gap:6px"><strong style="font-size:12px">${it.name}</strong><span class="kind ${it.done ? 'done' : it.kind}">${it.done ? 'DONE' : it.kind.toUpperCase()}</span></span><span class="soft small">${esc(it.summary)}</span></span><span class="muted small">${it.age}</span></button>`).join('');
    let detail = '';
    if (sel === 'approval') {
      const dec = state.approval;
      const resultText = { once: state.remember ? 'Allowed, and remembered for npm install --save-dev * in payments-api. You can revoke it in Settings → Agents.' : 'Allowed once. checkout-tests is running the install.', session: 'Allowed for this session. checkout-tests can repeat this command until it finishes.', denied: 'Denied. checkout-tests was told and is choosing another approach.' }[dec];
      detail = `<h2 class="row" style="font-size:15px;font-weight:600">${hue('var(--hue-pink)')} checkout-tests wants to run a command</h2>
        <code class="cmd" style="font-size:13px">npm install --save-dev msw@2</code>
        <dl><dt>In</dt><dd class="mono">worktrees/checkout-tests</dd><dt>Why</dt><dd>“MSW mocks the payments gateway in the new tests.”</dd><dt>Risk</dt><dd style="color:var(--warning)">● Medium · installs packages · network access · changes package.json and the lockfile</dd><dt>Rule</dt><dd class="soft">Not in the Propose allowlist for payments-api</dd></dl>
        ${dec ? `<div class="result ${dec === 'denied' ? 'no' : 'ok'}" role="status">${esc(resultText)}</div>` : `<label class="check"><input type="checkbox" data-change="remember" ${state.remember ? 'checked' : ''}> Always allow <code>npm install --save-dev *</code> in payments-api</label>
        <div class="row"><button type="button" class="btn btn-lg" data-action="decide" data-arg="denied">Deny <kbd>⌘⌫</kbd></button><button type="button" class="btn btn-primary btn-lg" data-action="decide" data-arg="once">${state.remember ? 'Allow and remember' : 'Allow once'} <kbd>⌘↩</kbd></button><button type="button" class="btn btn-lg" data-action="decide" data-arg="session">Allow for this session</button></div>`}`;
    } else if (sel === 'question') {
      detail = `<h2 class="row" style="font-size:15px;font-weight:600">${hue('var(--hue-cyan)')} api-docs asks</h2>
        <p style="font-size:14px;line-height:1.5">Should the docs also cover the deprecated v1 endpoints?</p>
        <div class="note" style="font-size:12px">Context from the agent: while documenting /v2/sessions it found 6 deprecated /v1 routes that the server still serves.</div>
        ${state.answer ? `<div class="result ok" role="status">Sent: “${esc(state.answer)}”. api-docs is carrying on.</div>` : `<div class="row"><button type="button" class="btn btn-lg" data-action="answer" data-arg="Yes, briefly">Yes, briefly</button><button type="button" class="btn btn-lg" data-action="answer" data-arg="No, v2 only">No, v2 only</button></div>
        <label class="field"><span class="flabel">Or answer in your own words</span><span class="row" style="flex-wrap:nowrap"><input class="input" style="flex:1;min-width:0" data-input="draft" data-fkey="draft" value="${esc(state.draft)}" placeholder="Mark them deprecated and link to the v2 page"><button type="button" class="btn btn-primary btn-lg" data-action="answer-draft" ${state.draft.trim() ? '' : 'disabled'}>Send</button></span></label>
        <span class="muted small">The agent is waiting. Your answer returns to it as the result of its question.</span>`}`;
    } else {
      const done = state.review.applied > 0;
      detail = `<h2 class="row" style="font-size:15px;font-weight:600">${hue('var(--hue-lime)')} rate-limit is ${done ? 'applied' : 'ready for review'}</h2>
        <div class="soft small">5 files · <span class="plus">+20</span> <span class="minus">−3</span> · 7 hunks · one overlaps your uncommitted edit in routes/index.ts</div>
        <div class="small" style="color:var(--success)">✓ Done when: “test” passed (48)</div>
        <div class="row"><button type="button" class="btn btn-primary btn-lg" data-action="tab" data-arg="review">Open Review Inbox</button>${done || state.reviewSnoozed ? '' : '<button type="button" class="btn btn-lg" data-action="snooze">Later</button>'}</div>`;
    }
    return `<section class="popover" role="dialog" aria-label="Needs you"><div class="alist"><div class="head"><strong>Needs you · ${openAttention()}</strong><span class="muted small">⌥⌘Y</span></div>${list}</div><div class="adetail">${detail}</div></section>`;
  }

  function delegateSheet() {
    const d = state.delegate;
    const WHERE = {
      worktree: ['Worktree', 'Recommended', 'A separate git worktree made from your current files, uncommitted changes included. Results come back through the Review Inbox.'],
      inplace: ['In place', 'Edits your working tree', 'Edits your files directly. AI Changes tracks every line it touches, and you can revert any of it.'],
      terminal: ['Terminal', 'Chat with it live', 'Opens Claude CLI in a terminal tab so you can talk to it as it works. Tracked in place.']
    };
    const TRUST = {
      observe: ['Observe', 'Reads and explains. Cannot edit files or run anything that changes them.'],
      propose: ['Propose', 'Edits inside its worktree and runs build and test commands. Asks before installs, network access, or anything else.'],
      pair: ['Pair', 'Edits your working tree, tracked line by line. Asks before touching a file you have unsaved changes in.'],
      autopilot: ['Autopilot', 'Runs everything except denylisted commands without asking. Allowed only in a worktree.']
    };
    if (d.submitted) {
      const dl = state.delegated;
      return `<section class="sheet" role="dialog" aria-modal="true" aria-labelledby="dlg-t"><div class="stack" style="gap:14px;padding:26px 24px">
        <h2 id="dlg-t" class="row" style="font-size:17px;font-weight:600">${hue('var(--hue-orange)')} Delegated</h2>
        <p>${esc(dl.name)} is starting ${dl.where === 'worktree' ? 'in a worktree' : dl.where === 'inplace' ? 'in your working tree' : 'in Terminal 3'} with the ${esc(dl.trust)} profile${d.doneTests ? ', and will run “test” when it finishes' : ''}.</p>
        <p class="soft small">You will hear from it only when it needs you or is ready for review.</p>
        <div class="row"><button type="button" class="btn btn-primary btn-lg" data-action="tab" data-arg="mission">Open Mission Control</button><button type="button" class="btn btn-lg" data-action="delegate-again">Delegate another</button></div></div></section>`;
    }
    const chips = [['file', 'session.ts'], ['sel', 'selection 18–29'], ['prob', 'Problems (2)']].filter(([k]) => !d.removed[k]);
    return `<section class="sheet" role="dialog" aria-modal="true" aria-labelledby="dlg-t"><div class="stack" style="gap:18px;padding:22px 24px 20px">
      <h2 id="dlg-t" style="font-size:17px;font-weight:600">Delegate to an agent</h2>
      <label class="field"><span class="flabel">What should the agent do?</span><textarea class="textarea" rows="3" data-input="delegate-prompt" data-fkey="delegate-prompt">${esc(d.prompt)}</textarea></label>
      <div class="field"><span class="flabel">Context</span><div class="row" style="gap:6px">${chips.map(([k, l]) => `<span class="chip"><span class="muted">@</span>${esc(l)}<button type="button" aria-label="Remove ${esc(l)} from context" data-action="chip-remove" data-arg="${k}">×</button></span>`).join('')}<button type="button" class="chip add" data-action="chip-restore">+ Add context</button></div></div>
      <div class="row" style="gap:12px"><span class="flabel" style="width:72px">Agent</span><button type="button" class="tbtn" data-action="toast" data-arg="Detected adapters: Claude CLI 2.1 (verified). Others appear here once installed.">Claude CLI 2.1 <span class="small" style="color:var(--success)">detected</span> ${I('chevronDown', 'sm')}</button></div>
      <fieldset style="margin:0;padding:0;border:0" class="field"><legend class="flabel" style="padding:0;margin-bottom:8px">Where</legend>
        <div class="row" style="align-items:stretch">${Object.keys(WHERE).map((id) => `<label class="optcard${d.where === id ? ' on' : ''}"><input type="radio" name="where" value="${id}" data-change="where" ${d.where === id ? 'checked' : ''}><span class="stack" style="gap:2px"><strong style="font-size:12px">${WHERE[id][0]}</strong><span class="soft small">${WHERE[id][1]}</span></span></label>`).join('')}</div>
        <span class="soft small">${WHERE[d.where][2]}</span></fieldset>
      <div class="field"><span class="flabel" id="trust-l">Trust</span><div class="seg" role="group" aria-labelledby="trust-l">${Object.keys(TRUST).map((id) => { const blocked = id === 'autopilot' && d.where !== 'worktree'; return `<button type="button" aria-pressed="${d.trust === id}" ${blocked ? 'disabled title="Autopilot runs only in a worktree"' : ''} data-action="trust" data-arg="${id}">${TRUST[id][0]}</button>`; }).join('')}</div><span class="soft small">${TRUST[d.trust][1]}</span></div>
      <div class="field"><span class="flabel">Done when</span><label class="check"><input type="checkbox" data-change="done-tests" ${d.doneTests ? 'checked' : ''}> Run configuration “test” passes. If it fails, the review says so.</label><label class="check"><input type="checkbox" data-change="limit" ${d.limit ? 'checked' : ''}> Stop after 30 minutes and keep the work for review</label></div>
      <div class="row" style="padding-top:14px;border-top:1px solid var(--line-strong)"><span class="muted small" style="flex:1 1 240px">Work from a worktree never reaches your main tree without your review. Approvals and questions arrive in Needs you.</span><button type="button" class="btn btn-lg" data-action="overlay-close">Cancel</button><button type="button" class="btn btn-primary btn-lg" data-action="delegate-submit" ${d.prompt.trim() ? '' : 'disabled'}>Delegate <kbd>⌘↩</kbd></button></div>
    </div></section>`;
  }

  function searchResults() {
    const q = state.search.q.trim().toLowerCase();
    const items = SEARCH_ITEMS.filter((it) => (state.search.tab === 'all' || it.type === state.search.tab) && (!q || (it.label + ' ' + it.detail).toLowerCase().includes(q)));
    const mark = (s) => {
      const t = esc(s);
      if (!q) return t;
      const i = s.toLowerCase().indexOf(q);
      return i < 0 ? t : esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length));
    };
    const sel = clamp(state.search.sel, 0, Math.max(0, items.length - 1));
    let html = '';
    let last = '';
    items.forEach((it, i) => {
      if (it.type !== last) { html += `<div class="group">${SEARCH_TABS.find((t) => t[0] === it.type)[1]}</div>`; last = it.type; }
      html += `<button type="button" class="res" role="option" aria-selected="${i === sel}" data-action="search-go" data-arg="${SEARCH_ITEMS.indexOf(it)}" id="res-${i}">${it.g ? glyphs(it.g) : `<span class="muted" aria-hidden="true">${it.type === 'actions' ? '›' : it.type === 'symbols' ? 'ƒ' : '≡'}</span>`}<span>${mark(it.label)}</span><span class="det">${esc(it.detail)}</span></button>`;
    });
    return { html: html || '<div class="group" style="text-transform:none;letter-spacing:0">Nothing matches. Try “refresh” or “rotate”.</div>', count: items.length, items };
  }
  function searchPalette() {
    const r = searchResults();
    return `<section class="palette" role="dialog" aria-modal="true" aria-label="Search Everywhere">
      <div class="q">${I('search')}<label class="vh" for="search-input">Search Everywhere</label><input id="search-input" data-input="search" data-fkey="search" value="${esc(state.search.q)}" placeholder="Search files, symbols, actions, text, agent history" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="search-results"><kbd>esc</kbd></div>
      <div class="ptabs" role="tablist">${SEARCH_TABS.map(([id, l]) => `<button type="button" role="tab" aria-selected="${state.search.tab === id}" data-action="search-tab" data-arg="${id}">${l}</button>`).join('')}</div>
      <div class="results" id="search-results" role="listbox" aria-label="Results">${r.html}</div>
      <div class="foot"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>↩</kbd> open</span><span><kbd>⇧</kbd><kbd>⇧</kbd> open from anywhere</span></div></section>`;
  }

  function settingsModal() {
    const st = state.settings;
    const tab = state.ui.settingsTab;
    const tabs = [['general', 'General', 'gear'], ['editor', 'Editor', 'code'], ['keymap', 'Keymap', 'keyboard'], ['agents', 'Agents', 'agent'], ['notifications', 'Notifications', 'bell']];
    const sw = (key, on, label) => `<button type="button" class="switch" role="switch" aria-checked="${on}" aria-label="${esc(label)}" data-action="setting" data-arg="${key}"></button>`;
    let body = '';
    if (tab === 'agents') {
      body = `<div class="sgroup"><h3>Agent CLIs</h3><table class="stable"><thead><tr><th>Adapter</th><th>Version</th><th>Status</th><th>Path</th></tr></thead><tbody>
          <tr><td>${G.ai} Claude CLI</td><td class="mono">2.1.314</td><td style="color:var(--success)">✓ verified: hooks, stream events, MCP</td><td class="mono soft">/opt/homebrew/bin/claude</td></tr>
          <tr><td class="soft">Other CLI</td><td class="mono soft">—</td><td class="soft">not installed · raw terminal mode when found</td><td class="soft">—</td></tr></tbody></table></div>
        <div class="sgroup"><h3>Default trust</h3><div class="row"><label class="check">Headless tasks <select class="select" data-change="set-headless">${['observe', 'propose', 'pair', 'autopilot'].map((p) => `<option value="${p}" ${st.headless === p ? 'selected' : ''}>${p[0].toUpperCase() + p.slice(1)}</option>`).join('')}</select></label><label class="check">Interactive sessions <select class="select" data-change="set-interactive">${['observe', 'pair'].map((p) => `<option value="${p}" ${st.interactive === p ? 'selected' : ''}>${p[0].toUpperCase() + p.slice(1)}</option>`).join('')}</select></label></div><span class="hint">You can change the profile for each task when you delegate it.</span></div>
        <div class="sgroup"><h3>Remembered approvals</h3>${allRules().length ? `<table class="stable"><thead><tr><th>Command</th><th>Scope</th><th>Created</th><th></th></tr></thead><tbody>${allRules().map((r) => `<tr><td class="mono">${esc(r.pattern)}</td><td class="soft">${esc(r.scope)}</td><td class="soft">${esc(r.created)}</td><td style="text-align:right"><button type="button" class="btn btn-sm btn-quiet" data-action="revoke" data-arg="${r.id}">Revoke</button></td></tr>`).join('')}</tbody></table>` : '<span class="hint">No remembered approvals. Agents ask each time.</span>'}</div>
        <div class="sgroup"><h3>Tracking</h3>
          <div class="srow"><span class="txt"><span>Precise tracking for CLIs you start yourself</span><span>A hook in ~/.claude/settings.json that does nothing unless the terminal was opened by Studio. Turn it off and attribution for hand-started CLIs drops to “likely”: watch the gutter marks fade.</span></span>${sw('precise', st.precise, 'Precise tracking for CLIs you start yourself')}</div>
          <div class="srow"><span class="txt"><span>Share my editor focus with agents</span><span>Lets agents see which files you have open and unsaved, so they can avoid them. Off by default.</span></span>${sw('shareFocus', st.shareFocus, 'Share my editor focus with agents')}</div>
          <div class="srow"><span class="txt"><span>Keep AI change history</span><span>Snapshots live in Studio’s own shadow repository, never in your .git.</span></span><select class="select" data-change="set-retention">${['7 days', '30 days', '90 days'].map((v) => `<option ${st.retention === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>`;
    } else if (tab === 'notifications') {
      const kinds = [['approval', 'An agent needs approval'], ['question', 'An agent asks a question'], ['review', 'A task is ready for review'], ['failed', 'A task failed'], ['long', 'A long terminal command finished']];
      body = `<div class="sgroup"><h3>Notify me when Studio is in the background</h3>${kinds.map(([k, l]) => `<div class="srow"><span class="txt"><span>${l}</span><span>${k === 'long' ? 'Commands that run longer than 10 seconds.' : 'Shown as a native notification with actions.'}</span></span>${sw('notify.' + k, st.notify[k], l)}</div>`).join('')}<span class="hint">While you are working in Studio, items wait in Needs you instead of interrupting.</span></div>`;
    } else if (tab === 'keymap') {
      body = `<div class="sgroup"><h3>Keymap</h3><div class="row" style="align-items:stretch">${[['jetbrains', 'JetBrains', 'Shift Shift, ⌘⇧A, ⌥↩ as in IntelliJ'], ['macos', 'macOS', 'Native text editing and system conventions']].map(([id, l, h]) => `<label class="optcard${st.keymap === id ? ' on' : ''}"><input type="radio" name="keymap" data-change="keymap" value="${id}" ${st.keymap === id ? 'checked' : ''}><span class="stack" style="gap:2px"><strong style="font-size:12px">${l}</strong><span class="soft small">${h}</span></span></label>`).join('')}</div><span class="hint">Every command can be remapped; conflicts are listed here.</span></div>`;
    } else if (tab === 'editor') {
      body = `<div class="sgroup"><h3>Editor</h3><div class="srow"><span class="txt"><span>Show authorship in the gutter</span><span>Marks each changed line as yours, an agent’s, or external.</span></span>${sw('gutter', st.gutter, 'Show authorship in the gutter')}</div><div class="srow"><span class="txt"><span>Code font</span><span>SF Mono 13 pt</span></span><button type="button" class="btn btn-sm" data-action="toast" data-arg="Font picker: SF Mono, Menlo, or any installed monospace font.">Change…</button></div></div>`;
    } else {
      body = `<div class="sgroup"><h3>General</h3><div class="srow"><span class="txt"><span>Reopen the last project at launch</span><span>Uses the folder access you granted, so you are not asked again.</span></span>${sw('reopen', st.reopen, 'Reopen the last project at launch')}</div><div class="srow"><span class="txt"><span>Appearance</span><span>Follows macOS: light, dark, and Increase Contrast.</span></span><span class="soft small">System</span></div></div>`;
    }
    return `<section class="modal" role="dialog" aria-modal="true" aria-label="Settings">
      <div class="mtitle"><div class="traffic"><button type="button" class="c" style="border:0;padding:0;cursor:pointer;width:12px;height:12px;border-radius:50%" aria-label="Close settings" data-action="overlay-close"></button><span class="m" aria-hidden="true"></span><span class="x" aria-hidden="true"></span></div>Settings</div>
      <div class="stabs" role="tablist">${tabs.map(([id, l, ic]) => `<button type="button" role="tab" aria-selected="${tab === id}" data-action="settings-tab" data-arg="${id}">${I(ic)}${l}</button>`).join('')}</div>
      <div class="sbody">${body}</div></section>`;
  }
  function allRules() {
    const rules = state.rules.slice();
    if (state.approval === 'once' && state.remember && !state.revokedRemember) rules.unshift({ id: 'r-msw', pattern: 'npm install --save-dev *', scope: 'Project · payments-api', created: 'Today' });
    return rules;
  }

  function toastHTML() {
    const t = state.toast;
    if (!t) return '';
    return `<div class="toast" role="status"><span class="${t.kind === 'warn' ? 'warn' : 'ok'}" aria-hidden="true">${t.kind === 'warn' ? '▲' : t.kind === 'info' ? 'ⓘ' : '✓'}</span><span>${esc(t.text)}</span>${t.action ? `<button type="button" class="btn btn-sm" data-action="${t.action}" data-arg="${esc(t.arg || '')}">${esc(t.label)}</button>` : ''}<button type="button" class="ibtn" aria-label="Dismiss" data-action="toast-close">${I('close', 'sm')}</button></div>`;
  }

  /* ------------------------------- Welcome -------------------------------- */
  function welcomeWindow() {
    const w = state.welcome;
    const names = ['Project', 'Tools', 'Keymap', 'Agents'];
    const steps = names.map((n, i) => `<span class="st${i === w.step ? ' on' : ''}${i < w.step ? ' ok' : ''}">${i < w.step ? '✓' : i + 1} ${n}</span>`).join('');
    let card = '';
    if (w.step === 0) {
      card = `<h2 style="font-size:17px;font-weight:600">Choose a project folder</h2><p class="soft">Studio only reads and writes inside folders you approve. macOS remembers the approval, so you are asked once.</p>
        ${w.folder ? `<div class="detect">${I('folder')}<span style="flex:1"><strong>payments-api</strong> · <span class="mono soft">~/src/payments-api</span></span><span style="color:var(--success)">✓ access saved</span></div>` : '<button type="button" class="btn btn-primary btn-lg" style="align-self:flex-start" data-action="welcome-folder">Choose folder…</button>'}`;
    } else if (w.step === 1) {
      const rows = [['git', '2.47', true, ''], ['Claude CLI', '2.1.314 · verified', true, ''], ['TypeScript language server', '4.3', true, ''], ['ripgrep', 'bundled', true, ''], ['rust-analyzer', 'not found', false, 'rustup component add rust-analyzer']];
      card = `<h2 style="font-size:17px;font-weight:600">Tools on this Mac</h2><p class="soft">Studio uses the tools you already have. Nothing is downloaded without asking.</p>${rows.map(([n, v, ok, hint]) => `<div class="detect"><span style="color:${ok ? 'var(--success)' : 'var(--warning)'}">${ok ? '✓' : '▲'}</span><span style="flex:1"><strong>${n}</strong> <span class="soft">${v}</span></span>${hint ? `<code class="mono small soft">${hint}</code>` : ''}</div>`).join('')}`;
    } else if (w.step === 2) {
      card = `<h2 style="font-size:17px;font-weight:600">Keymap</h2><div class="row" style="align-items:stretch">${[['jetbrains', 'JetBrains', 'Recommended if you use IntelliJ, WebStorm, or RustRover'], ['macos', 'macOS', 'System conventions first']].map(([id, l, h]) => `<label class="optcard${w.keymap === id ? ' on' : ''}"><input type="radio" name="wkeymap" data-change="welcome-keymap" value="${id}" ${w.keymap === id ? 'checked' : ''}><span class="stack" style="gap:2px"><strong style="font-size:12px">${l}</strong><span class="soft small">${h}</span></span></label>`).join('')}</div>`;
    } else {
      card = `<h2 style="font-size:17px;font-weight:600">How much may agents do by default?</h2><div class="row" style="align-items:stretch">${[['propose', 'Propose', 'Recommended. Work happens in a worktree; you review before anything reaches your files.'], ['pair', 'Pair', 'Agents edit your working tree, tracked line by line.'], ['observe', 'Observe', 'Agents explain and answer, and change nothing.']].map(([id, l, h]) => `<label class="optcard${w.trust === id ? ' on' : ''}"><input type="radio" name="wtrust" data-change="welcome-trust" value="${id}" ${w.trust === id ? 'checked' : ''}><span class="stack" style="gap:2px"><strong style="font-size:12px">${l}</strong><span class="soft small">${h}</span></span></label>`).join('')}</div><span class="soft small">You can change this for each task, and in Settings → Agents.</span>`;
    }
    const nextDisabled = w.step === 0 && !w.folder;
    return `<div class="win bare"><header class="toolbar"><div class="traffic" aria-hidden="true"><span class="c"></span><span class="m"></span><span class="x"></span></div><span class="title">Welcome to Studio</span><span class="spacer"></span></header>
      <div class="welcome"><div class="inner"><div class="stack" style="gap:6px"><h1 style="font-size:22px;font-weight:600">${G.ai} Studio</h1><p class="soft">An IDE where you and your agents work on the same code, and you always know who changed what.</p></div>
        <div class="steps" aria-label="Setup steps">${steps}</div>
        <div class="wcard">${card}</div>
        <div class="row"><button type="button" class="btn btn-lg" data-action="welcome-step" data-arg="-1" ${w.step === 0 ? 'disabled' : ''}>Back</button><span class="spacer"></span><button type="button" class="btn btn-quiet btn-lg" data-action="welcome-finish">Skip setup</button>${w.step < 3 ? `<button type="button" class="btn btn-primary btn-lg" data-action="welcome-step" data-arg="1" ${nextDisabled ? 'disabled' : ''}>Continue</button>` : '<button type="button" class="btn btn-primary btn-lg" data-action="welcome-finish">Open payments-api</button>'}</div>
      </div></div></div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Rendering with focus and scroll preserved                          */
  /* ------------------------------------------------------------------ */
  function focusKey(el) {
    if (!el || el === document.body || !$app.contains(el)) return null;
    if (el.dataset.fkey) return { sel: `[data-fkey="${CSS.escape(el.dataset.fkey)}"]`, text: true };
    if (el.dataset.action) return { sel: `[data-action="${CSS.escape(el.dataset.action)}"]${el.dataset.arg != null ? `[data-arg="${CSS.escape(el.dataset.arg)}"]` : ''}` };
    if (el.dataset.change) return { sel: `[data-change="${CSS.escape(el.dataset.change)}"]${el.value ? `[value="${CSS.escape(el.value)}"]` : ''}` };
    return null;
  }
  function render() {
    const active = document.activeElement;
    const fk = focusKey(active);
    const caret = fk && fk.text && 'selectionStart' in active ? [active.selectionStart, active.selectionEnd] : null;
    const scroll = {};
    $app.querySelectorAll('[data-scroll]').forEach((el) => { scroll[el.dataset.scroll] = [el.scrollTop, el.scrollLeft]; });
    $app.innerHTML = windowHTML();
    $app.querySelectorAll('[data-scroll]').forEach((el) => { const s = scroll[el.dataset.scroll]; if (s) { el.scrollTop = s[0]; el.scrollLeft = s[1]; } });
    if (focusAfter) {
      const el = $app.querySelector(focusAfter);
      focusAfter = null;
      if (el) { el.focus(); if (el.tagName === 'INPUT' && el.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length); return; }
    }
    if (fk) {
      let el = $app.querySelector(fk.sel);
      // A decided hunk swaps Accept/Reject for Undo: keep focus on the same hunk.
      if (!el && active.dataset.arg && active.dataset.arg.includes('|')) {
        el = $app.querySelector(`[data-action="${CSS.escape(active.dataset.action)}"][data-arg^="${CSS.escape(active.dataset.arg.split('|')[0] + '|')}"]`);
      }
      if (el) { el.focus({ preventScroll: true }); if (caret && el.setSelectionRange) { try { el.setSelectionRange(caret[0], caret[1]); } catch (e) { /* not a text input */ } } }
    }
  }

  function renderChrome() {
    document.body.classList.toggle('embed', EMBED);
    if (EMBED) return;
    const bar = document.getElementById('reviewbar');
    const i = SCENES.findIndex((s) => s.id === state.scene);
    bar.innerHTML = `<span class="brand"><span class="g-ai" aria-hidden="true">◆</span> Studio UI · prototype</span>
      <button type="button" class="rb-btn" data-action="scene-step" data-arg="-1" aria-label="Previous screen" ${i <= 0 ? 'disabled' : ''}>${I('chevronLeft', 'sm')}</button>
      <label class="vh" for="scene-select">Screen</label><select id="scene-select" class="rb-select" data-change="scene">${SCENES.map((s) => `<option value="${s.id}" ${s.id === state.scene ? 'selected' : ''}>${s.code} · ${esc(s.name)}</option>`).join('')}</select>
      <button type="button" class="rb-btn" data-action="scene-step" data-arg="1" aria-label="Next screen" ${i >= SCENES.length - 1 ? 'disabled' : ''}>${I('chevronRight', 'sm')}</button>
      <span class="rb-hint">Shift Shift: search · Esc: close</span>
      <span class="rb-spacer"></span>
      <button type="button" class="rb-btn" data-action="notes-toggle" aria-expanded="${state.notesOpen}" aria-controls="notes">Review notes</button>
      <button type="button" class="rb-btn" data-action="reset">Reset</button>
      <a class="rb-btn" href="index.html">Spec</a>
      <div class="narrow-note">This prototype is a desktop app. On a narrow screen, scroll sideways or open it on a larger display.</div>`;
    const notes = document.getElementById('notes');
    const n = NOTES[state.scene];
    const sc = SCENES[i];
    notes.hidden = !state.notesOpen;
    notes.innerHTML = `<h2>${sc.code} · ${esc(sc.name)}</h2><p>${esc(n.what)}</p><strong style="color:var(--text-primary)">Try</strong><ul>${n.tries.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <div class="row">${n.notify ? '<button type="button" class="rb-btn" data-action="notify-demo">Simulate background notification</button>' : ''}<a href="index.html#${n.spec}">Read the spec for this screen</a><button type="button" class="rb-btn" data-action="notes-toggle" style="margin-left:auto">Close</button></div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Actions                                                            */
  /* ------------------------------------------------------------------ */
  function setScene(id, push) {
    const sc = SCENES.find((s) => s.id === id) || SCENES[0];
    state.scene = sc.id;
    Object.assign(state.ui, { bottomH: 190 }, sc.ui);
    state.consoleSession = sc.consoleSession || 'token-refresh';
    if (!sc.ui.tab.startsWith('file:') && sc.ui.tab !== 'welcome' && !state.openTabs.includes(sc.ui.tab)) state.openTabs.push(sc.ui.tab);
    state.card = null;
    state.toast = null;
    if (sc.ui.overlay === 'search') focusAfter = '#search-input';
    if (sc.ui.overlay === 'delegate') focusAfter = '[data-fkey="delegate-prompt"]';
    if (push && !EMBED) history.replaceState(null, '', '#' + sc.id);
    renderChrome();
    render();
    const code = $app.querySelector('.code');
    const cursor = code && code.querySelector('.presence');
    if (cursor) code.scrollTop = Math.max(0, cursor.parentElement.offsetTop - code.clientHeight / 2);
  }
  function toast(text, kind, action, label, arg) {
    state.toast = { text, kind: kind || 'ok', action, label, arg };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { state.toast = null; render(); }, 7000);
  }
  function openTab(id) {
    if (!state.openTabs.includes(id)) state.openTabs.push(id);
    state.ui.tab = id;
    state.ui.overlay = null;
    state.card = null;
  }
  function openOverlay(name) {
    state.ui.overlay = state.ui.overlay === name ? null : name;
    state.card = null;
    if (state.ui.overlay === 'search') { state.search.sel = 0; focusAfter = '#search-input'; }
    if (state.ui.overlay === 'delegate') focusAfter = state.delegate.submitted ? '[data-action="tab"][data-arg="mission"]' : '[data-fkey="delegate-prompt"]';
    if (state.ui.overlay === 'attention') focusAfter = '.arow[aria-current="true"]';
    if (state.ui.overlay === 'settings') focusAfter = '.stabs [aria-selected="true"]';
    render();
  }
  function closeOverlay() {
    const was = state.ui.overlay;
    state.ui.overlay = null;
    if (was === 'delegate' && state.delegate.submitted) state.delegate.submitted = false;
    focusAfter = was === 'attention' ? '.needs' : was === 'search' ? '[aria-label^="Search Everywhere"]' : null;
    render();
  }
  function decide(kind) {
    state.approval = kind;
    if (state.ui.overlay === 'attention') state.ui.attention = 'approval';
    toast(kind === 'denied' ? 'Denied. checkout-tests was told and is taking another approach.' : 'Allowed. checkout-tests is running the install.', kind === 'denied' ? 'info' : 'ok');
    render();
  }
  function answer(text) {
    state.answer = text;
    toast(`Sent to api-docs: “${text}”`);
    render();
  }
  function moveReviewFocus(delta) {
    const file = REVIEW_FILES.find((f) => f.id === state.review.sel);
    const next = state.review.focus + delta;
    if (next >= 0 && next < file.hunks.length) { state.review.focus = next; render(); return; }
    const fi = REVIEW_FILES.indexOf(file) + (delta > 0 ? 1 : -1);
    if (fi >= 0 && fi < REVIEW_FILES.length) {
      state.review.sel = REVIEW_FILES[fi].id;
      state.review.focus = delta > 0 ? 0 : REVIEW_FILES[fi].hunks.length - 1;
      render();
    }
  }
  function decideFocused(kind) {
    const file = REVIEW_FILES.find((f) => f.id === state.review.sel);
    const h = file.hunks[state.review.focus];
    if (!h || state.review.applied) return;
    state.review.dec[h.id] = kind === 'accepted' && h.conflict ? 'resolved' : kind;
    moveReviewFocus(1);
    render();
  }
  function applyReview() {
    const n = reviewAccepted();
    if (!n || state.review.applied) return;
    state.review.applied = n;
    toast(`Applied ${n} hunks to your working tree. A safety checkpoint was saved first.`, 'ok', 'review-undo', 'Undo');
    render();
  }

  const actions = {
    'scene-step': (arg) => { const i = SCENES.findIndex((s) => s.id === state.scene) + Number(arg); if (SCENES[i]) setScene(SCENES[i].id, true); },
    'notes-toggle': () => { state.notesOpen = !state.notesOpen; renderChrome(); },
    reset: () => { const keep = { notesOpen: state.notesOpen }; state = initialState(); Object.assign(state, keep); setScene(location.hash.slice(1) || 'workspace', false); },
    'notify-demo': () => showNotification(),
    toast: (arg) => { toast(arg, 'info'); render(); },
    'toast-close': () => { state.toast = null; render(); },
    left: (arg) => { state.ui.left = state.ui.left === arg ? null : arg; render(); },
    right: (arg) => { state.ui.right = state.ui.right === arg ? null : arg; render(); },
    bottom: (arg) => {
      const isTerm = (b) => b === 'term1' || b === 'term2';
      state.ui.bottom = (state.ui.bottom === arg || (arg === 'term2' && isTerm(state.ui.bottom))) ? null : arg;
      render();
    },
    'bottom-tab': (arg) => { state.ui.bottom = arg; render(); },
    tab: (arg) => { openTab(arg); render(); },
    closetab: (arg) => {
      state.openTabs = state.openTabs.filter((t) => t !== arg);
      if (state.ui.tab === arg) state.ui.tab = 'file:src/auth/session.ts';
      render();
    },
    open: (arg) => { openTab('file:' + arg); render(); },
    overlay: (arg) => openOverlay(arg),
    'overlay-close': () => closeOverlay(),
    'attention-open': (arg) => { state.ui.attention = arg; state.ui.overlay = null; openOverlay('attention'); },
    'settings-open': (arg) => { state.ui.settingsTab = arg; state.ui.overlay = null; openOverlay('settings'); },
    mode: (arg) => { state.mode = arg; render(); },
    since: () => { state.since = (state.since + 1) % SINCE.length; render(); },
    card: (arg, el) => {
      const [path, n] = arg.split('|');
      const center = el.closest('.center').getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (state.card && state.card.path === path && state.card.n === Number(n)) { state.card = null; render(); return; }
      state.card = { path, n: Number(n), top: Math.min(r.bottom - center.top + 4, center.height - 220), left: clamp(r.right - center.left + 10, 8, center.width - 336) };
      focusAfter = '.hovercard .btn';
      render();
    },
    'card-close': () => { state.card = null; render(); },
    'view-diff': (arg) => { state.changes.session = 'token-refresh'; state.changes.step = null; state.changes.file = arg; openTab('changes'); render(); },
    revert: (arg) => {
      state.card = null;
      const h = HUNKS[arg];
      if (h.overlap) {
        toast(`Nothing was reverted: this change overlaps your edit on line ${h.overlap}. Open it in AI Changes to merge line by line.`, 'warn', 'view-diff', 'Open AI Changes', h.file);
      } else {
        state.reverted[arg] = true;
        toast(`Reverted the agent's ${h.what} change. Your edits were kept, and a safety checkpoint was saved.`, 'ok', 'undo-revert', 'Undo', arg);
      }
      render();
    },
    'undo-revert': (arg) => { delete state.reverted[arg]; state.toast = null; render(); },
    'revert-session': () => { toast('Reverting the whole session would undo every agent hunk. One hunk overlaps your edit on line 19, so Studio would open the merge view for it and revert the rest.', 'warn'); render(); },
    pause: () => { state.paused = !state.paused; toast(state.paused ? 'Paused token-refresh. It stops before its next tool call.' : 'Resumed token-refresh.', 'info'); render(); },
    interrupt: () => { state.tokenStopped = true; state.paused = false; toast('Stopped token-refresh. Its changes stay in AI Changes.', 'info'); render(); },
    'resume-token': () => { state.tokenStopped = false; toast('Resumed token-refresh from its last turn.', 'info'); render(); },
    earlier: () => { state.changes.earlier = true; state.changes.session = 'token-refresh'; openTab('changes'); render(); },
    'earlier-toggle': () => { state.changes.earlier = !state.changes.earlier; render(); },
    step: (arg) => {
      state.changes.session = 'token-refresh';
      state.changes.step = state.changes.step === arg ? null : arg;
      state.changes.file = null;
      if (state.ui.tab !== 'changes') openTab('changes');
      render();
    },
    'step-open': (arg) => { state.changes.step = arg; state.changes.session = 'token-refresh'; openTab('changes'); render(); },
    'changes-session': (arg) => { state.changes.session = arg; render(); },
    'changes-file': (arg) => { state.changes.file = state.changes.file === arg ? null : arg; render(); },
    reviewed: (arg) => { state.reviewed[arg] = true; render(); },
    unreview: (arg) => { delete state.reviewed[arg]; render(); },
    decide: (arg) => decide(arg),
    answer: (arg) => answer(arg),
    'answer-draft': () => { if (state.draft.trim()) answer(state.draft.trim()); },
    snooze: () => { state.reviewSnoozed = true; render(); },
    'att-sel': (arg) => { state.ui.attention = arg; render(); },
    'console-open': (arg) => { state.consoleSession = arg; state.ui.bottom = 'console'; render(); },
    'console-switch': () => { state.consoleSession = state.consoleSession === 'tutor' ? 'token-refresh' : 'tutor'; render(); },
    'console-send': () => sendConsole(),
    expand: (arg) => { state.expanded[arg] = !state.expanded[arg]; render(); },
    run: () => { state.ran = true; state.ui.bottom = 'run'; toast('test passed: 14 tests in 2.3 s.'); render(); },
    'review-file': (arg) => { state.review.sel = arg; state.review.focus = 0; render(); },
    'review-view': (arg) => { state.review.view = arg; render(); },
    hunk: (arg) => {
      const [id, kind] = arg.split('|');
      if (kind) state.review.dec[id] = kind; else delete state.review.dec[id];
      const file = REVIEW_FILES.find((f) => f.id === state.review.sel);
      const idx = file.hunks.findIndex((h) => h.id === id);
      if (idx >= 0) state.review.focus = idx;
      render();
    },
    'review-file-all': (arg) => {
      const file = REVIEW_FILES.find((f) => f.id === state.review.sel);
      file.hunks.forEach((h) => { if (!state.review.dec[h.id] && !(arg === 'accepted' && h.conflict)) state.review.dec[h.id] = arg; });
      render();
    },
    'review-apply': () => applyReview(),
    'review-undo': () => { state.review.applied = 0; state.toast = null; render(); },
    'delegate-submit': () => submitDelegate(),
    'delegate-again': () => { state.delegate = Object.assign(initialState().delegate, { prompt: '' }); focusAfter = '[data-fkey="delegate-prompt"]'; render(); },
    'chip-remove': (arg) => { state.delegate.removed[arg] = true; render(); },
    'chip-restore': () => { state.delegate.removed = {}; render(); },
    trust: (arg) => { state.delegate.trust = arg; render(); },
    'search-tab': (arg) => { state.search.tab = arg; state.search.sel = 0; focusAfter = '#search-input'; render(); },
    'search-go': (arg) => goSearch(SEARCH_ITEMS[Number(arg)]),
    'settings-tab': (arg) => { state.ui.settingsTab = arg; render(); },
    setting: (arg) => {
      if (arg.startsWith('notify.')) { const k = arg.slice(7); state.settings.notify[k] = !state.settings.notify[k]; } else state.settings[arg] = !state.settings[arg];
      if (arg === 'precise' && state.settings.precise) toast('Hook installed in ~/.claude/settings.json. It does nothing unless the terminal was opened by Studio.');
      render();
    },
    revoke: (arg) => {
      if (arg === 'r-msw') state.revokedRemember = true; else state.rules = state.rules.filter((r) => r.id !== arg);
      toast('Revoked. Agents will ask before running that command again.', 'info');
      render();
    },
    'git-stage': (arg) => { state.git.stage = arg; render(); },
    'git-commit': () => {
      const what = { mine: 'your changes only; agent changes stay in the working tree, still attributed', ai: 'the agent’s changes only; yours stay unstaged', all: 'all 4 files' }[state.git.stage];
      toast(`Committed ${what}${state.git.trailer ? ', with the AI-Assisted trailer' : ''}.`);
      state.git.msg = '';
      render();
    },
    'lesson-fix': () => { state.lesson.fixed = true; render(); },
    'lesson-check': () => { state.lesson.result = state.lesson.fixed ? 'pass' : 'fail'; state.ui.bottom = 'console'; state.consoleSession = 'tutor'; render(); },
    'lesson-hint': () => { state.lesson.hint = true; state.ui.bottom = 'console'; state.consoleSession = 'tutor'; render(); },
    'welcome-folder': () => { state.welcome.folder = true; render(); },
    'welcome-step': (arg) => { state.welcome.step = clamp(state.welcome.step + Number(arg), 0, 3); render(); },
    'welcome-finish': () => { setScene('workspace', true); toast('Welcome to Studio. payments-api is open.'); render(); }
  };

  function submitDelegate() {
    const d = state.delegate;
    if (!d.prompt.trim()) return;
    const n = state.delegated ? 3 : 2;
    state.delegated = {
      name: 'token-refresh-' + n,
      where: d.where,
      mode: d.where === 'worktree' ? 'WORKTREE' : d.where === 'inplace' ? 'IN PLACE' : 'TERMINAL 3',
      trust: d.trust[0].toUpperCase() + d.trust.slice(1),
      title: d.prompt.trim().length > 70 ? d.prompt.trim().slice(0, 68) + '…' : d.prompt.trim()
    };
    d.submitted = true;
    focusAfter = '[data-action="tab"][data-arg="mission"]';
    render();
  }
  function sendConsole() {
    const text = state.consoleDraft.trim();
    if (!text) return;
    const sess = state.consoleSession;
    state.consoleExtra[sess].push({ who: 'you', text });
    state.consoleDraft = '';
    render();
    setTimeout(() => {
      state.consoleExtra[sess].push({ who: 'agent', text: sess === 'tutor' ? 'Good question. Try predicting the result before you run the check; then compare.' : 'Noted. I’ll apply that after the current edit, before I run the tests again.' });
      render();
    }, 700);
  }
  function goSearch(it) {
    if (!it) return;
    state.ui.overlay = null;
    const [kind, target] = [it.go.slice(0, it.go.indexOf(':')), it.go.slice(it.go.indexOf(':') + 1)];
    if (kind === 'file') openTab('file:' + target);
    else if (kind === 'tab') openTab(target);
    else if (kind === 'overlay') { openOverlay(target); return; }
    render();
  }
  function showNotification() {
    const root = document.getElementById('notify-root');
    root.innerHTML = `<div class="notify" role="status"><div class="row" style="gap:8px"><span class="app" aria-hidden="true">S</span><strong>Studio</strong><span class="rb-spacer"></span><span class="muted small">now</span></div><strong>checkout-tests wants to run a command</strong><span class="soft small">npm install --save-dev msw@2 · medium risk</span><div class="acts"><button type="button" data-action="notify-allow">Allow once</button><button type="button" data-action="notify-review">Review</button></div></div>`;
    clearTimeout(showNotification.t);
    showNotification.t = setTimeout(() => { root.innerHTML = ''; }, 9000);
  }
  actions['notify-allow'] = () => { document.getElementById('notify-root').innerHTML = ''; decide('once'); };
  actions['notify-review'] = () => { document.getElementById('notify-root').innerHTML = ''; state.ui.attention = 'approval'; state.ui.overlay = null; openOverlay('attention'); };

  /* ------------------------------------------------------------------ */
  /* Events                                                             */
  /* ------------------------------------------------------------------ */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.action];
    if (!fn) return;
    e.preventDefault();
    fn(el.dataset.arg, el, e);
  });

  document.addEventListener('input', (e) => {
    const el = e.target;
    const key = el.dataset && el.dataset.input;
    if (!key) return;
    if (key === 'delegate-prompt') {
      state.delegate.prompt = el.value;
      const b = $app.querySelector('[data-action="delegate-submit"]');
      if (b) b.disabled = !el.value.trim();
    } else if (key === 'draft') {
      state.draft = el.value;
      const b = $app.querySelector('[data-action="answer-draft"]');
      if (b) b.disabled = !el.value.trim();
    } else if (key === 'search') {
      state.search.q = el.value;
      state.search.sel = 0;
      const box = $app.querySelector('#search-results');
      if (box) box.innerHTML = searchResults().html;
    } else if (key === 'console') {
      state.consoleDraft = el.value;
    } else if (key === 'git-msg') {
      state.git.msg = el.value;
      const b = $app.querySelector('[data-action="git-commit"]');
      if (b) b.disabled = !el.value.trim();
    }
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    const key = el.dataset && el.dataset.change;
    if (!key) return;
    const map = {
      scene: () => setScene(el.value, true),
      where: () => { state.delegate.where = el.value; if (el.value !== 'worktree' && state.delegate.trust === 'autopilot') state.delegate.trust = 'pair'; else if (state.delegate.trust !== 'observe') state.delegate.trust = el.value === 'worktree' ? 'propose' : 'pair'; render(); },
      'done-tests': () => { state.delegate.doneTests = el.checked; render(); },
      limit: () => { state.delegate.limit = el.checked; render(); },
      remember: () => { state.remember = el.checked; render(); },
      'git-trailer': () => { state.git.trailer = el.checked; render(); },
      'set-headless': () => { state.settings.headless = el.value; render(); },
      'set-interactive': () => { state.settings.interactive = el.value; render(); },
      'set-retention': () => { state.settings.retention = el.value; render(); },
      keymap: () => { state.settings.keymap = el.value; render(); },
      'welcome-keymap': () => { state.welcome.keymap = el.value; render(); },
      'welcome-trust': () => { state.welcome.trust = el.value; render(); }
    };
    if (map[key]) map[key]();
  });

  let lastShift = 0;
  document.addEventListener('keydown', (e) => {
    if (EMBED) return;
    const tag = e.target.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    const mod = e.metaKey || e.ctrlKey;
    if (e.key !== 'Shift') lastShift = 0;
    if (e.key === 'Escape') {
      if (state.card) { state.card = null; render(); e.preventDefault(); return; }
      if (state.ui.overlay) { closeOverlay(); e.preventDefault(); return; }
      if (state.notesOpen) { state.notesOpen = false; renderChrome(); return; }
    }
    if (e.key === 'Shift' && !e.repeat && !mod && !e.altKey && !(typing && e.target.id !== 'search-input')) {
      const now = Date.now();
      if (now - lastShift < 400 && state.ui.tab !== 'welcome') { lastShift = 0; if (state.ui.overlay !== 'search') openOverlay('search'); } else lastShift = now;
      return;
    }
    if (state.ui.tab === 'welcome') return;
    if (mod && !e.shiftKey && e.key.toLowerCase() === 'k') { e.preventDefault(); openOverlay('search'); return; }
    if (mod && e.shiftKey && e.code === 'KeyY') { e.preventDefault(); openOverlay('delegate'); return; }
    if (mod && e.altKey && e.code === 'KeyY') { e.preventDefault(); openOverlay('attention'); return; }
    if (mod && e.key === ',') { e.preventDefault(); openOverlay('settings'); return; }
    const o = state.ui.overlay;
    if (o === 'search') {
      const r = searchResults();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        state.search.sel = clamp(state.search.sel + (e.key === 'ArrowDown' ? 1 : -1), 0, Math.max(0, r.count - 1));
        const box = $app.querySelector('#search-results');
        if (box) { box.innerHTML = searchResults().html; const s = box.querySelector('[aria-selected="true"]'); if (s) s.scrollIntoView({ block: 'nearest' }); }
        return;
      }
      if (e.key === 'Enter' && typing) { e.preventDefault(); goSearch(r.items[clamp(state.search.sel, 0, r.count - 1)]); return; }
    }
    if (o === 'delegate' && mod && e.key === 'Enter') { e.preventDefault(); submitDelegate(); return; }
    if (o === 'attention' && state.ui.attention === 'approval' && !state.approval && mod) {
      if (e.key === 'Enter') { e.preventDefault(); decide(e.altKey ? 'session' : 'once'); return; }
      if (e.key === 'Backspace') { e.preventDefault(); decide('denied'); return; }
    }
    if (o === 'attention' && state.ui.attention === 'question' && e.key === 'Enter' && typing && state.draft.trim()) { e.preventDefault(); answer(state.draft.trim()); return; }
    if (e.target.dataset && e.target.dataset.input === 'console' && e.key === 'Enter') { e.preventDefault(); sendConsole(); return; }
    if (typing || o) return;
    if (state.ui.tab === 'review') {
      if (mod && e.key === 'Enter') { e.preventDefault(); applyReview(); return; }
      if (mod || e.altKey) return;
      const k = e.key;
      if (k === 'j') { e.preventDefault(); moveReviewFocus(1); return; }
      if (k === 'k') { e.preventDefault(); moveReviewFocus(-1); return; }
      if (k === 'a') { e.preventDefault(); decideFocused('accepted'); return; }
      if (k === 'x') { e.preventDefault(); decideFocused('rejected'); return; }
      if (k === 'A') { e.preventDefault(); actions['review-file-all']('accepted'); return; }
      if (k === 'X') { e.preventDefault(); actions['review-file-all']('rejected'); return; }
    }
  });

  // Drag to resize tool windows
  document.addEventListener('pointerdown', (e) => {
    const grip = e.target.closest('[data-grip]');
    if (!grip) return;
    e.preventDefault();
    const which = grip.dataset.grip;
    const win = $app.querySelector('.win');
    const sx = e.clientX;
    const sy = e.clientY;
    const start = { left: state.ui.leftW, right: state.ui.rightW, bottom: state.ui.bottomH };
    grip.setPointerCapture(e.pointerId);
    const move = (ev) => {
      if (which === 'left') { state.ui.leftW = clamp(start.left + ev.clientX - sx, 180, 520); win.style.setProperty('--left-w', state.ui.leftW + 'px'); }
      if (which === 'right') { state.ui.rightW = clamp(start.right - (ev.clientX - sx), 260, 600); win.style.setProperty('--right-w', state.ui.rightW + 'px'); }
      if (which === 'bottom') { state.ui.bottomH = clamp(start.bottom - (ev.clientY - sy), 120, 560); win.style.setProperty('--bottom-h', state.ui.bottomH + 'px'); }
    };
    const up = () => { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up); };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  });

  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (id && id !== state.scene && SCENES.some((s) => s.id === id)) setScene(id, false);
  });

  /* Init */
  const startScene = location.hash.slice(1);
  setScene(SCENES.some((s) => s.id === startScene) ? startScene : 'workspace', false);
})();
