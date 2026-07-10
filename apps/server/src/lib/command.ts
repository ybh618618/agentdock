import { access } from "node:fs/promises";

export function quoteShell(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

export async function commandExists(command: string): Promise<boolean> {
  const pathEntries = (process.env.PATH || "").split(process.platform === "win32" ? ";" : ":");
  const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];

  for (const entry of pathEntries) {
    for (const extension of extensions) {
      try {
        await access(`${entry}/${command}${extension}`);
        return true;
      } catch {
        // Keep looking through PATH.
      }
    }
  }

  return false;
}

export async function runCommand(
  command: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number } = {},
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const processHandle = Bun.spawn(command, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const timeout = options.timeoutMs
    ? setTimeout(() => processHandle.kill(), options.timeoutMs)
    : undefined;

  try {
    const [exitCode, stdout, stderr] = await Promise.all([
      processHandle.exited,
      new Response(processHandle.stdout).text(),
      new Response(processHandle.stderr).text(),
    ]);
    return { exitCode, stdout, stderr };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
