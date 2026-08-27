import test from "node:test";
import assert from "node:assert/strict";
import { scrubSecrets } from "../src/scrub.js";

test("redacts an AWS access key", () => {
  // AWS key = "AKIA" + exactly 16 alnum chars
  const { scrubbed, redactions } = scrubSecrets("key=AKIAIOSFODNN7EXAMPLE end");
  assert.equal(redactions, 1);
  assert.match(scrubbed, /\[REDACTED\]/);
});

test("redacts API key assignments (kv_secret)", () => {
  const { scrubbed, redactions } = scrubSecrets("api_key=sk-secretvalue123456");
  assert.equal(redactions, 1);
  assert.match(scrubbed, /\[REDACTED\]/);
});

test("redacts bearer tokens", () => {
  const { scrubbed, redactions } = scrubSecrets("Authorization: Bearer abcdefghijklmnopqrstuvwxyz");
  assert.equal(redactions, 1);
  assert.match(scrubbed, /\[REDACTED\]/);
});

test("redacts stripe vendor keys", () => {
  const { scrubbed, redactions } = scrubSecrets("sk_test_abcdefghijklmnopqrstuvwxyz1234");
  assert.equal(redactions, 1);
  assert.match(scrubbed, /\[REDACTED\]/);
});

test("keeps non-secret text untouched", () => {
  const { scrubbed, redactions } = scrubSecrets("hello world this is a normal message");
  assert.equal(redactions, 0);
  assert.equal(scrubbed, "hello world this is a normal message");
});