# trace

I like other heavy AI users has had this stressful loop of  selecting the stack trace with my mouse, copying it, alt-tab to Claude Code or Cursor, paste, type "what broke," wait. Doing that 100 times in a day is what made me build this

`trace` just wraps whatever command you'd normally run. When it crashes, trace catches the error, blanks out anything that looks like a secret, and drops the whole thing on your clipboard ready to paste into whatever AI agent you're already using. That's it. No dashboard, no config file, no accounts to set up for the core thing.

## Install

```
npm install -g tracewrap
```

That gives you the `trace` command globally.

Package isn't live on npm yet? Run it straight from the repo instead:

```
cd trace && npm link
```

## How you actually use it

Instead of:

```
npm start
```

you run:

```
trace npm start
```

Same output, same everything — trace just sits there quietly watching until something goes wrong. Works the same with any language, not just Node:

```
trace node server.js
trace -- python app.py
```

When it does catch a crash, you get something like this:

```
🚨 Error caught by trace:
────────────────────────────────────────
KnexTimeoutError: Timeout acquiring a connection
────────────────────────────────────────
🔒 Scrubbed 1 likely secret before copying.
✅ Context copied to your clipboard — paste it into your AI agent.
```

Grab it, paste it into your agent, move on with your day.

## Commands

```
trace <command> [args...]     wrap a command
trace -- <command> [args...]  same, if you need to be explicit about the command
trace logout                  clear a saved license + cache
trace --help                  everything above, quickly
```

You'll also see `trace login` and `trace undo` mentioned in `--help` — those are for the paid plan, which isn't turned on yet (more on that below).

## What's free (and what isn't, yet)

Right now, everything that actually works is free: crash detection, secret scrubbing, clipboard handoff. No license key, no signup, no catch. That's genuinely the whole product at the moment, and I'm in no rush to change that.

There's a Pro plan planned a git checkpoint before you touch a fix, `trace undo` to bail out if the fix makes things worse, and a restart-and-verify step so you're not just hoping the crash is actually gone:

```
Fix it, then: [Enter] restart & verify   [u] undo to last checkpoint   [q] quit
```

But **it's not live**. No payment link, no license key that unlocks anything — I'd rather ship the free version, see what people actually do with it, and build the paid tier around real use instead of guessing. If you want to know when it's ready, there's a waitlist at trace.sh. Trying `trace login` right now will just tell you it's coming.

## Rough edges, so you're not surprised

- `trace undo` (once it's live) only puts back files git already knows about. Anything new your agent created gets left behind — worth a `git status` check after an undo.
- Crash detection is pattern-matching on common stack trace shapes (Node, Python, Go). It's not going to catch everything, especially anything unusual.
- Copying to your clipboard needs `pbcopy`, `clip`, or `xclip`/`xsel`/`wl-copy` depending on your OS. If none of those exist, trace just prints the context instead so you don't lose it.

## Working on it locally

```
git clone https://github.com/itsyu5668-sys/trace-cli.git
cd trace
npm install
npm link
```

## License

MIT. Do what you want with it — see [LICENSE](./LICENSE).

## Where else to find this

Landing page (and the waitlist) is at trace.sh. If you found a bug or something's confusing, open an issue — I'd genuinely rather hear about it than have you quietly stop using it.
