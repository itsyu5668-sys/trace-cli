// Heuristics for "something just broke" in an arbitrary piped process.
// Doesn't need to be perfect - it needs to catch the common cases
// (Node, Python, Ruby, Go stack traces) without drowning in false
// positives on normal log noise.

const ERROR_LINE_PATTERNS = [
  /\bTraceback \(most recent call last\)/i,
  /^\s*at .+\(.+:\d+:\d+\)/, // Node.js stack trace frame
  /\w*Error: /, // TypeError:, ReferenceError:, KnexTimeoutError:, etc.
  /\bException\b.*:/,
  /panic: /i, // Go
  /Unhandled (rejection|exception)/i,
  /FATAL/i,
  /\bsegmentation fault\b/i,
];

const MAX_CONTEXT_LINES = 60;

export function createErrorDetector({ onError }) {
  let buffer = [];
  let inErrorBlock = false;
  let errorLines = [];
  let flushTimer = null;

  function isErrorLine(line) {
    return ERROR_LINE_PATTERNS.some((re) => re.test(line));
  }

  function scheduleFlush() {
    clearTimeout(flushTimer);
    // Stack traces/tracebacks print many lines in a burst; wait a beat
    // for the burst to finish before treating it as one error event.
    flushTimer = setTimeout(flush, 250);
  }

  function flush() {
    if (errorLines.length === 0) return;
    const contextBefore = buffer.slice(-10); // a little log context leading up to it
    onError({
      errorLines: errorLines.slice(0, MAX_CONTEXT_LINES),
      contextBefore,
    });
    errorLines = [];
    inErrorBlock = false;
  }

  function feed(line) {
    buffer.push(line);
    if (buffer.length > 200) buffer.shift();

    if (isErrorLine(line)) {
      inErrorBlock = true;
      errorLines.push(line);
      scheduleFlush();
      return;
    }

    if (inErrorBlock) {
      // Stack trace continuation lines are usually indented or start with "at "/"File "
      if (/^\s+/.test(line) || /^\s*File "/.test(line)) {
        errorLines.push(line);
        scheduleFlush();
        return;
      }
      // A non-indented, non-error line ends the burst
      scheduleFlush();
    }
  }

  return {
    feed,
    flushNow: () => {
      clearTimeout(flushTimer);
      flush();
    },
  };
}
