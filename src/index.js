import { spawn } from "node:child_process";
import readline from "node:readline";
import { createErrorDetector } from "./detect.js";
import { scrubSecrets } from "./scrub.js";
import { copyToClipboard } from "./clipboard.js";
import { isGitRepo, createSnapshot, getLastSnapshot, revertToSnapshot } from "./snapshot.js";

function formatPrompt({ errorLines, contextBefore }) {
  const context = contextBefore.length
    ? `Recent log output before the crash:\n${contextBefore.join("\n")}\n\n`
    : "";

  return (
    `My app just crashed. Here's the error:\n\n` +
    `${errorLines.join("\n")}\n\n` +
    context +
    `Can you find the cause and propose a fix? Show me the diff before applying anything.`
  );
}

function ask(rl, question) {
  return new Promise((resolve) => {
    try {
      rl.question(question, (answer) => resolve(answer.trim().toLowerCase()));
    } catch {
      resolve("q"); // stdin closed on us (e.g. non-interactive/piped) - default to quitting cleanly
    }
  });
}

async function spawnOnce(command, args, detector) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ["inherit", "pipe", "pipe"],
      shell: process.platform === "win32",
    });

    function handleChunk(streamName) {
      return (chunk) => {
        const text = chunk.toString();
        process[streamName === "stdout" ? "stdout" : "stderr"].write(text);
        for (const line of text.split("\n")) {
          if (line.length) detector.feed(line);
        }
      };
    }

    child.stdout.on("data", handleChunk("stdout"));
    child.stderr.on("data", handleChunk("stderr"));

    const onSignal = () => child.kill("SIGINT");
    process.on("SIGINT", onSignal);

    child.on("close", (code) => {
      process.off("SIGINT", onSignal);
      resolve(code);
    });
  });
}

export async function runTrace(command, args, { pro = false } = {}) {
  if (!command) {
    console.error("Usage: trace <command> [args...]");
    console.error('Example: trace npm start');
    process.exit(1);
  }

  const gitAvailable = await isGitRepo();
  if (!gitAvailable) {
    console.log("\u26A0\uFE0F  Not inside a git repo \u2014 undo safety-net is disabled for this run.\n");
  }

  let running = true;
  let lastErrorCaught = false;
  let proTipShown = false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  while (running) {
    let pendingCount = 0;

    const detector = createErrorDetector({
      onError: async ({ errorLines, contextBefore }) => {
        pendingCount++;
        lastErrorCaught = true;

        const snapshotHash = pro && gitAvailable ? await createSnapshot("pre-fix") : null;

        const prompt = formatPrompt({ errorLines, contextBefore });
        const { scrubbed, redactions } = scrubSecrets(prompt);

        console.log("\n\u{1F6A8} Error caught by trace:");
        console.log("\u2500".repeat(60));
        console.log(errorLines.slice(0, 6).join("\n"));
        if (errorLines.length > 6) console.log(`  ... (${errorLines.length - 6} more lines)`);
        console.log("\u2500".repeat(60));

        if (redactions > 0) {
          console.log(`\u{1F512} Scrubbed ${redactions} likely secret(s) before copying.`);
        }
        if (snapshotHash) {
          console.log(`\u{1F4F8} Checkpointed your working tree (run 'trace undo' any time to revert to this point).`);
        } else if (!pro && gitAvailable && !proTipShown) {
          proTipShown = true;
          console.log(
            "Pro tip: `trace` can checkpoint your code before you fix this and let you undo bad fixes \u2014 see trace.sh/pro"
          );
        }

        const copied = await copyToClipboard(scrubbed);
        if (copied) {
          console.log("\u2705 Context copied to your clipboard \u2014 paste it into your AI agent.\n");
        } else {
          console.log("\u26A0\uFE0F  Couldn't reach the system clipboard. Here's the context instead:\n");
          console.log(scrubbed);
          console.log();
        }
        pendingCount--;
      },
    });

    console.log(`\u{1F440} trace is watching '${[command, ...args].join(" ")}'...\n`);
    const code = await spawnOnce(command, args, detector);
    detector.flushNow();
    while (pendingCount > 0) await new Promise((r) => setTimeout(r, 20));

    console.log(`\n\u{1F440} trace: process exited with code ${code}.`);

    if (code !== 0 && lastErrorCaught && !pro) {
      // Free tier: crash detection, scrubbing, and clipboard copy have
      // already happened. No checkpoint was made and no fix menu is shown.
      running = false;
      rl.close();
      process.exit(code ?? 0);
    }

    if (code !== 0 && lastErrorCaught) {
      lastErrorCaught = false;
      const answer = await ask(
        rl,
        "\nFix it, then: [Enter] restart & verify   [u] undo to last checkpoint   [q] quit\n> "
      );
      if (answer === "u") {
        const snap = getLastSnapshot();
        if (snap) {
          const ok = await revertToSnapshot(snap.hash);
          console.log(ok ? "\u23EA reverted to the last checkpoint.\n" : "\u274C revert failed \u2014 check git status.\n");
        } else {
          console.log("No checkpoint found.\n");
        }
        continue; // restart to verify after undo
      } else if (answer === "q") {
        running = false;
        rl.close();
        process.exit(code ?? 0);
      }
      // default: fall through and restart to verify the fix
      console.log("\u{1F504} Restarting to verify...\n");
      continue;
    }

    running = false;
    rl.close();
    process.exit(code ?? 0);
  }
}
