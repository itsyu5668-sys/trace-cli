// License gating for trace's Pro features.
//
// Free tier (no license): crash detection, secret scrubbing, clipboard
// handoff all work exactly as before.
// Pro tier: unlocks git checkpoint, `trace undo`, and the
// restart-to-verify loop.
//
// Design goals:
//  - Never block startup on a network call. We serve the last cached
//    decision immediately and re-validate in the background.
//  - Cache the "valid" decision for ~24h so Pro still works fully
//    offline within that window.
//  - A key is only ever stored locally in ~/.trace/license.json (or via
//    TRACE_LICENSE_KEY); we never transmit it except to the backend.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const STATE_DIR = join(homedir(), ".trace");
const STATE_FILE = join(STATE_DIR, "license.json");
const CACHE_FILE = join(STATE_DIR, "cache.json");

// Deploy goal — point this at your verify-license endpoint once
// Phase 2 is deployed. Can be overridden at runtime with TRACE_API_URL.
const DEFAULT_API_URL = "https://your-trace-api.example.com";
export const API_URL = process.env.TRACE_API_URL ?? DEFAULT_API_URL;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RE_CHECK_COOLDOWN_MS = 12 * 60 * 60 * 1000; // at most ~2 background re-checks/day

// Paid plan is paused for a free-only, waitlist launch. While this is
// true, Pro features stay off for everyone regardless of any saved key:
//   - `isPro()` always returns false  -> checkpoint/undo/fix-menu never run
//   - `validateLicense()` returns false -> `trace login` won't activate Pro
// Flip this to false (and point API_URL at your real backend + drop the
// PRO_TEST_KEY) once you're ready to sell Pro again.
const PRO_PAUSED = true;

// Feature-test key so `trace login` / Pro can be exercised end-to-end
// before the Phase 2 backend exists. Remove once the real backend ships.
const PRO_TEST_KEY = "trc_live_bogus_000000000000000000000000000000";

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function getLicenseKey() {
  if (process.env.TRACE_LICENSE_KEY) return process.env.TRACE_LICENSE_KEY.trim();
  return readJson(STATE_FILE)?.licenseKey?.trim() ?? null;
}

function readCache() {
  return readJson(CACHE_FILE);
}

function writeCache(valid, status) {
  try {
    mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(
      CACHE_FILE,
      JSON.stringify({ valid: !!valid, status, checkedAt: Date.now() }, null, 2)
    );
  } catch {
    // cache is best-effort; a failure just means we re-validate sooner
  }
}

function cacheIsFresh(cache) {
  return !!cache && Date.now() - cache.checkedAt < CACHE_TTL_MS;
}

async function verifyAgainstBackend(key, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}/api/verify-license?key=${encodeURIComponent(key)}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Explicit, user-invoked validation (trace login). Returns true/false
 * and persists the cache on success.
 */
export async function validateLicense(key) {
  if (PRO_PAUSED) return false; // paid plan paused — nothing to validate
  if (!key) return false;
  if (key === PRO_TEST_KEY) {
    writeCache(true, "active");
    return true;
  }
  const body = await verifyAgainstBackend(key, 8000);
  if (!body) return false;
  const ok = body.valid === true;
  writeCache(ok, body.status ?? "unknown");
  return ok;
}

export function saveLicenseKey(key) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify({ licenseKey: key }, null, 2));
}

/**
 * Pro features are enabled if we hold a locally-cached valid decision
 * that's still inside its TTL. This never blocks on the network: the
 * cached decision is returned immediately, (at most ~2/day) to keep
 * the cache fresh.
 */
export async function isPro() {
  if (PRO_PAUSED) return false; // paid plan paused — Pro stays off for everyone
  const key = getLicenseKey();
  if (!key) {
    // No saved key / env key: never Pro, however the cache looks.
    // A cache entry is only meaningful alongside a real key.
    return false;
  }
  const cache = readCache();
  if (cache && cacheIsFresh(cache) && cache.valid === true) {
    scheduleBackgroundRecheck();
    return true;
  }

  // No fresh valid cache, but we do have a key: do a one-off live check
  // (still bounded by a timeout). If it fails/offline, fall back to
  // whatever the cache says — a stale "valid" is better than stripping
  // Pro mid-crash.
  const body = await verifyAgainstBackend(key, 5000);
  if (body && body.valid === true) {
    writeCache(true, body.status ?? "active");
    return true;
  }
  return !!cache && cache.valid === true;
}

let lastBackgroundCheck = 0;
function scheduleBackgroundRecheck() {
  if (Date.now() - lastBackgroundCheck < RE_CHECK_COOLDOWN_MS) return;
  lastBackgroundCheck = Date.now();
  setTimeout(() => {
    isPro().catch(() => {});
  }, 0);
}

export { CACHE_TTL_MS };