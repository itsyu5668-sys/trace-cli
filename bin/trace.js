#!/usr/bin/env node
import { runTrace } from "../src/index.js";
import { getLastSnapshot, revertToSnapshot } from "../src/snapshot.js";
import { validateLicense, saveLicenseKey, isPro } from "../src/license.js";

const args = process.argv.slice(2);

async function main() {
  if (args[0] === "--help" || args[0] === "-h" || args[0] === "help") {
    const { version } = JSON.parse(
      (await import("node:fs")).readFileSync(new URL("../package.json", import.meta.url), "utf8")
    );
    console.log(`trace v${version}`);
    console.log();
    console.log("Usage:");
    console.log("  trace <command> [args...]    Wrap a command; catch crashes, scrub secrets,");
    console.log("                               and copy context to clipboard.");
    console.log("  trace -- <command>           Same, but treat the next token literally.");
    console.log("  trace login <key>            (coming soon) save a Pro license key.");
    console.log("  trace logout                 Remove any saved license key and cache.");
    console.log("  trace undo                   (coming soon) revert working tree to last checkpoint.");
    console.log("  trace --help                 Show this help.");
    console.log();
    console.log("Free tier (no license): crash detection, secret scrubbing, clipboard copy.");
    console.log("Pro tier (coming soon): git checkpoint, `trace undo`, and the restart-to-verify loop.");
    console.log("              Join the waitlist at trace.sh — the paid plan isn't active yet.");
    process.exit(0);
  }

  if (args[0] === "--version" || args[0] === "-v") {
    const { version } = JSON.parse(
      (await import("node:fs")).readFileSync(new URL("../package.json", import.meta.url), "utf8")
    );
    console.log(version);
    process.exit(0);
  }

  if (args[0] === "login") {
    const key = args[1];
    if (!key) {
      console.log("Usage: trace login <license-key>");
      process.exit(1);
    }
    const ok = await validateLicense(key);
    if (!ok) {
      console.log(
        "The paid plan isn't active yet \u2014 Pro is coming soon.\n" +
        "Join the waitlist at trace.sh and we'll email you when it opens."
      );
      process.exit(1);
    }
    saveLicenseKey(key);
    console.log("\u2705 License saved. Pro features are now active on this machine.");
    process.exit(0);
  }

  if (args[0] === "logout") {
    const fs = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const dir = path.join(os.homedir(), ".trace");
    for (const name of ["license.json", "cache.json"]) {
      const file = path.join(dir, name);
      if (fs.existsSync(file)) fs.rmSync(file, { force: true });
    }
    console.log("Logged out of trace Pro.");
    process.exit(0);
  }

  if (args[0] === "undo") {
    const pro = await isPro();
    if (!pro) {
      console.log(
        "trace undo is a Pro feature that isn't active yet \u2014 it's coming soon.\n" +
        "Join the waitlist at trace.sh and we'll email you when it opens."
      );
      process.exit(1);
    }
    const snap = getLastSnapshot();
    if (!snap) {
      console.log("No checkpoint found in this directory.");
      process.exit(1);
    }
    const ok = await revertToSnapshot(snap.hash);
    console.log(
      ok
        ? `\u23EA Reverted to checkpoint from ${snap.at}.`
        : "\u274C Revert failed \u2014 check git status."
    );
    process.exit(ok ? 0 : 1);
  }

  // Support both `trace npm start` and `trace -- npm start`
  const cleaned = args[0] === "--" ? args.slice(1) : args;
  const [command, ...rest] = cleaned;

  const pro = await isPro();
  await runTrace(command, rest, { pro });
}

main();
