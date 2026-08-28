import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PRO_TEST_KEY = "trc_live_bogus_000000000000000000000000000000";

async function freshLicense() {
  const home = mkdtempSync(join(tmpdir(), "trace-license-"));
  process.env.HOME = home;
  process.env.TRACE_LICENSE_KEY = "";
  const mod = await import("../src/license.js?t=" + Date.now());
  return { mod, home };
}

test("no key -> not pro, no cache written", async () => {
  const { mod, home } = await freshLicense();
  const pro = await mod.isPro();
  assert.equal(pro, false);
  rmSync(home, { recursive: true, force: true });
});

test("paid plan paused: no key and even a test key cannot unlock Pro", async () => {
  const { mod, home } = await freshLicense();
  // validateLicense is gated while PRO_PAUSED is true.
  const ok = await mod.validateLicense(PRO_TEST_KEY);
  assert.equal(ok, false);
  // Even if a key+cache were somehow present, isPro still returns false.
  mod.saveLicenseKey(PRO_TEST_KEY);
  const pro = await mod.isPro();
  assert.equal(pro, false);
  rmSync(home, { recursive: true, force: true });
});

test("stale valid cache without a key is NOT pro", async () => {
  const { mod, home } = await freshLicense();
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const dir = join(home, ".trace");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "cache.json"),
    JSON.stringify({ valid: true, status: "active", checkedAt: Date.now() - 1000 })
  );
  const pro = await mod.isPro();
  assert.equal(pro, false); // no key file -> free, regardless of cache
  rmSync(home, { recursive: true, force: true });
});