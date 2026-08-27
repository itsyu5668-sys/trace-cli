import { spawn } from "node:child_process";
import { platform } from "node:os";

function run(cmd, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["pipe", "ignore", "ignore"] });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
    child.stdin.write(input);
    child.stdin.end();
  });
}

export async function copyToClipboard(text) {
  const p = platform();
  try {
    if (p === "darwin") {
      await run("pbcopy", [], text);
    } else if (p === "win32") {
      await run("clip", [], text);
    } else {
      // Linux: try xclip, then xsel, then wl-copy (Wayland)
      try {
        await run("xclip", ["-selection", "clipboard"], text);
      } catch {
        try {
          await run("xsel", ["--clipboard", "--input"], text);
        } catch {
          await run("wl-copy", [], text);
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}
