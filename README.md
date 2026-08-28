# trace

Wraps any command. When it crashes, trace catches the error, scrubs
anything that looks like a secret, checkpoints your working tree (Pro),
and copies a ready-to-paste prompt to your clipboard — so you can hand
it to Claude Code, Cursor, or whatever agent you're already using
without copy-pasting a stack trace by hand.

## Install

```
npm install -g tracewrap
```

This makes the `trace` command available globally on your machine.

> Before the package is published to npm, install from source:
> `cd trace && npm link`

## Commands

```
trace <command> [args...]     Wrap a command
trace -- <command> [args...]  Same, but treat the next token literally
trace logout                  Remove any saved license key + cache
trace --help                  Usage overview
```

> `trace login <key>` and `trace undo` are listed in `trace --help` but are
> **coming soon** — the paid (Pro) plan isn't active yet. See below.

## Free tier (no license)

Crash detection, secret scrubbing, and clipboard handoff all work with
no license key:

```
trace npm start
trace node server.js
trace -- python app.py
```

trace runs your command like normal — all output streams through as
usual. When something crashes:

1. It shows you the caught error
2. Scrubs likely secrets (API keys, tokens, passwords) before anything
   leaves your machine
3. Copies the error + context to your clipboard — paste it into your
   agent

Once per session it also hints at the Pro features coming soon.

## Pro tier — NOT ACTIVE (coming soon)

The paid plan is **paused for now**. trace is shipping **free-only**
first: crash detection, secret scrubbing, and clipboard handoff work
out of the box with no license, and those are the whole product today.

The Pro plan will add three things, but **it is not purchasable yet**:

- **Git checkpoint** before you start the fix — `trace undo` can get
  you back to the exact pre-fix state, no matter what you or your agent
  try next
- **`trace undo`** — standalone revert to the last checkpoint
- **Restart-to-verify loop** — after a crash you get this prompt:

```
Fix it, then: [Enter] restart & verify   [u] undo to last checkpoint   [q] quit
```

  - **Enter** — restarts your app to check whether the crash is actually
    gone
  - **u** — reverts your working tree to the checkpoint from right
    before you started fixing
  - **q** — quits, leaving things as they are

> **Join the waitlist at trace.sh** — the paid plan is **not active**.
> `trace login` and `trace undo` will return a "coming soon" message until
> it ships. No license key will unlock Pro today, by design: we're
> shipping free first to see what people actually need before we build
> the paid tier.

## What's in v1

- [x] Crash detection (Node/Python/Go-style stack traces + generic error patterns)
- [x] Secret scrubbing before anything is copied
- [x] Clipboard handoff, agent-agnostic (works with any agent you paste into)
- [~] Git-based checkpoint before you touch the "fix" (Pro — **coming soon**)
- [~] Restart-to-verify loop (Pro — **coming soon**)
- [~] `trace undo` (Pro — **coming soon**)
- [~] License gating — free tier open; paid plan paused until launch

## Known limitations (be aware before you rely on this)

- `trace undo` only restores **tracked** files via `git reset --hard`.
  New untracked files your agent creates are left behind — check
  `git status` after an undo.
- Error checks are heuristic (pattern-matching common stack trace
  shapes). They won't catch every possible error format, especially in
  languages/frameworks not yet tested against.
- Clipboard access requires `pbcopy` (macOS), `clip` (Windows), or
  `xclip`/`xsel`/`wl-copy` (Linux) to be available. If none are found,
  trace prints context instead so nothing is lost.

## Development

```
git clone https://github.com/itsyu5668-sys/trace-cli.git
cd trace
npm install
npm link   # makes `trace` available globally from this checkout
```

## License

MIT — see [LICENSE](./LICENSE).

## Marketing

- Landing page: trace.sh (waitlist signup)
- Free tier: crash detection, secret scrubbing, clipboard handoff
- Pro tier: checkpoint + undo + restart-to-verify loop — **coming soon** (not active, no payment yet)
