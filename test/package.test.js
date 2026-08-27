import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

test("bin declares a bootable trace entry", async () => {
  assert.equal(pkg.bin.trace, "./bin/trace.js");
  const binPath = join(ROOT, pkg.bin.trace.replace(/^\.\//, ""));
  assert.ok(existsSync(binPath), "bin/trace.js must exist");
  assert.ok(existsSync(join(ROOT, "src", "index.js")), "imported src/index.js must exist");
  // Boot it (runs --version then exits 0)
  const { stdout } = await execFileAsync(process.execPath, [binPath, "--version"]);
  assert.match(stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test("main points at an existing src/index.js", () => {
  assert.equal(pkg.main, "src/index.js");
  const mainPath = join(ROOT, pkg.main.replace(/^\.\//, ""));
  assert.ok(existsSync(mainPath));
});

test("source modules referenced by index exist", () => {
  for (const f of ["detect.js", "scrub.js", "snapshot.js", "clipboard.js", "license.js"]) {
    assert.ok(existsSync(join(ROOT, "src", f)), `src/${f} must exist`);
  }
});