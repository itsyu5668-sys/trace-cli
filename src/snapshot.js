import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const STATE_DIR = ".trace";
const STATE_FILE = join(STATE_DIR, "last-snapshot.json");

function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.on("close", (code) => resolve({ code, out: out.trim() }));
    child.on("error", () => resolve({ code: 1, out: "" }));
  });
}

export async function isGitRepo() {
  const { code } = await run("git", ["rev-parse", "--is-inside-work-tree"]);
  return code === 0;
}

/**
 * Snapshots the full working tree (tracked changes + index) without
 * disturbing what's currently on disk. Costs nothing - it's a local
 * git object, no upload, no storage bill.
 */
export async function createSnapshot(label) {
  if (!(await isGitRepo())) return null;

  // `git stash create` builds a commit object representing the current
  // worktree + index and returns its hash, WITHOUT touching the worktree.
  const { code, out: hash } = await run("git", ["stash", "create"]);

  // If there's nothing dirty, stash create returns empty - fall back to
  // the current HEAD so `trace undo` still has something to point at.
  const snapshotHash = code === 0 && hash ? hash : (await run("git", ["rev-parse", "HEAD"])).out;
  if (!snapshotHash) return null;

  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR);
  writeFileSync(
    STATE_FILE,
    JSON.stringify({ hash: snapshotHash, label, at: new Date().toISOString() }, null, 2)
  );
  return snapshotHash;
}

export function getLastSnapshot() {
  if (!existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

/** Hard-resets tracked files back to the snapshot. Untracked new files
 * an agent created are left alone - documented v1 limitation. */
export async function revertToSnapshot(hash) {
  const { code } = await run("git", ["reset", "--hard", hash]);
  return code === 0;
}
