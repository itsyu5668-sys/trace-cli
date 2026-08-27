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
trace login <key>             Activate Pro with a license key
trace logout                  Remove your saved license key + cache
trace undo                    (Pro) revert working tree to last checkpoint
trace --help                  Usage overview
```

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

Once per session it also hints that the Pro features exist.

## Pro tier

`trace login <key>` (after a purchase at trace.sh/pro) unlocks three
things:

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

Pro status is cached locally for ~24h, so it keeps working offline for
most of a day; it re-validates in the background so startup is never
blocked on the network.

## What's in v1

- [x] Crash detection (Node/Python/Go-style stack traces + generic error patterns)
- [x] Secret scrubbing before anything is copied
- [x] Git-based checkpoint before you touch the "fix" (Pro)
- [x] Restart-to-verify loop (Pro)
- [x] `trace undo` (Pro)
- [x] Clipboard handoff, agent-agnostic (works with any agent you paste into)
- [x] License gating — free tier open, Pro unlocked by key

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

- Landing page: trace.sh/pro (or the placeholder URL above)
- Free tier: crash detection, secret scrubbing, clipboard handoff
- Pro tier: checkpoint + undo + restart-to-verify loop ($9/mo or ~$79/yr)
