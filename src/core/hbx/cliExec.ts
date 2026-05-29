import { spawn } from "child_process";
import { existsSync } from "fs";
import { getHbxCliPath } from "./paths";

export function hbxCliExists(hbuilderPath: string): boolean {
  return existsSync(getHbxCliPath(hbuilderPath));
}

export function execHbxCli(
  hbuilderPath: string,
  args: string[],
  timeoutMs?: number
): Promise<{ stdout: string; stderr: string; code: number }> {
  const cliPath = getHbxCliPath(hbuilderPath);
  return new Promise((resolve, reject) => {
    const child = spawn(cliPath, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer =
      timeoutMs !== undefined
        ? setTimeout(() => {
            if (!settled) {
              settled = true;
              child.kill();
              resolve({ stdout, stderr, code: -1 });
            }
          }, timeoutMs)
        : undefined;

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      if (!settled) {
        settled = true;
        if (timer) clearTimeout(timer);
        reject(err);
      }
    });
    child.on("close", (code) => {
      if (!settled) {
        settled = true;
        if (timer) clearTimeout(timer);
        resolve({ stdout, stderr, code: code ?? -1 });
      }
    });
  });
}
