# Contributing to trace

Thanks for helping out! trace is MIT-licensed and open source. The free
core (crash detection, secret scrubbing, clipboard handoff) is fully in
the open; the Pro gates (checkpoint/undo/verify loop) are enforced at
runtime by license, not by hidden source.

## Setup

```bash
git clone https://github.com/itsyu5668-sys/trace-cli.git
cd trace
npm install
npm link   # `trace` command now available globally from this checkout
```

## Running the CLI

```
trace --help
trace -- <your command here>
trace login <key>
trace undo
```

## Project layout

- `bin/trace.js` — CLI entrypoint (argument routing)
- `src/index.js` — the watch/run loop
- `src/detect.js` — crash detection heuristics
- `src/scrub.js` — secret scrubbing
- `src/snapshot.js` — git checkpoint / revert
- `src/clipboard.js` — platform clipboard handoff
- `src/license.js` — Pro license gating (key file, 24h cache, background re-check)

## Tests

Run the test suite with:

```
npm test
```

There are no unit tests yet — add coverage as you go for any behavior
you touch. Sign-off on behavior changes in a PR.

## Style

- Plain Node ESM, no build step, no runtime dependencies.
- Keep the CLI dependency-free and fast to boot.
- Heuristics (crash detection, scrubbing) err on the side of
  over-capturing; a false positive is cheap, a missed secret is not.

## PRs

- Open a PR against `main`.
- Update the README if your change is user-visible.
- Keep changes focused; consider conversation history in the PR
  description a plus, not a requirement.

## License

MIT — see `LICENSE`.