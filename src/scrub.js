// Strips things that look like secrets out of text before it's ever
// copied to a clipboard or handed to an agent. Errs on the side of
// over-redacting - a false positive just means one extra [REDACTED],
// a false negative means a leaked key.

const PATTERNS = [
  // AWS access key IDs
  { name: "aws_access_key", re: /\bAKIA[0-9A-Z]{16}\b/g },
  // Generic "key/token/secret/password = ..." assignments
  {
    name: "kv_secret",
    re: /\b(api[_-]?key|secret|token|password|passwd|pwd|auth)\b\s*[:=]\s*["']?[A-Za-z0-9\-_./+=]{8,}["']?/gi,
  },
  // Bearer tokens in headers
  { name: "bearer_token", re: /\bBearer\s+[A-Za-z0-9\-_.]{10,}\b/g },
  // Stripe-style secret keys
  { name: "stripe_key", re: /\b(sk|rk)_(live|test)_[A-Za-z0-9]{16,}\b/g },
  // OpenAI/Anthropic-style keys
  { name: "vendor_key", re: /\b(sk-[A-Za-z0-9]{20,}|sk-ant-[A-Za-z0-9\-]{20,})\b/g },
  // Generic long base64/hex blobs that show up in connection strings
  {
    name: "conn_string_creds",
    re: /:\/\/[^\s:]+:[^\s@]{6,}@/g,
  },
];

export function scrubSecrets(text) {
  let scrubbed = text;
  let redactions = 0;

  for (const { re } of PATTERNS) {
    scrubbed = scrubbed.replace(re, (match) => {
      redactions++;
      // Keep connection-string form readable but redacted
      if (match.includes("://")) {
        return match.replace(/:[^\s@]{6,}@/, ":[REDACTED]@");
      }
      return "[REDACTED]";
    });
  }

  return { scrubbed, redactions };
}
