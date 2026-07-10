import { homedir } from "node:os";
import type { RuntimeInfo } from "@agentdock/shared";
import { config } from "../config";
import { commandExists, quoteShell, runCommand } from "../lib/command";
import type { RuntimeAdapter, SpawnSpec } from "./types";

export class WindowsWslRuntime implements RuntimeAdapter {
  readonly kind = "windows-wsl" as const;

  async inspect(): Promise<RuntimeInfo> {
    if (!(await commandExists("wsl"))) {
      return {
        platform: this.kind,
        status: "missing",
        containerName: config.distroName,
        distribution: "Ubuntu 26.04",
        message: "需要启用 Windows Subsystem for Linux",
      };
    }
    const result = await runCommand(["wsl.exe", "--list", "--quiet"]);
    const installed = result.stdout
      .replaceAll("\u0000", "")
      .split("\n")
      .some((name) => name.trim() === config.distroName);
    return {
      platform: this.kind,
      status: installed ? "ready" : "missing",
      containerName: config.distroName,
      distribution: "Ubuntu 26.04",
      message: installed ? "WSL 2" : "等待导入 AgentDock.wsl",
    };
  }

  async ensure(options: { aptMirror: string; autoUpdate: boolean }): Promise<RuntimeInfo> {
    const inspected = await this.inspect();
    if (inspected.status !== "ready") return inspected;
    await this.run("sudo", ["bash", "/opt/agentdock/provision-ubuntu.sh", options.aptMirror]);
    if (options.autoUpdate) void this.updatePackages();
    return this.inspect();
  }

  async reset(): Promise<void> {
    const result = await runCommand(["wsl.exe", "--unregister", config.distroName]);
    if (result.exitCode !== 0) throw new Error(result.stderr || result.stdout || "无法重置 WSL");
  }

  async updatePackages(): Promise<void> {
    await this.run("bash", [
      "-lc",
      "nohup agentdock-maintain >~/.local/state/agentdock/apt-update.log 2>&1 </dev/null &",
    ]);
  }

  spawn(command: string, args: string[], cwd: string): SpawnSpec {
    const commandLine = [command, ...args].map(quoteShell).join(" ");
    return {
      file: "wsl.exe",
      args: [
        "--distribution",
        config.distroName,
        "--",
        "bash",
        "-lc",
        `cd ${quoteShell(cwd)} && exec ${commandLine}`,
      ],
      env: { TERM: "xterm-256color", COLORTERM: "truecolor" },
    };
  }

  spawnShell(cwd: string): SpawnSpec {
    return {
      file: "wsl.exe",
      args: [
        "--distribution",
        config.distroName,
        "--",
        "bash",
        "-lc",
        `cd ${quoteShell(cwd)} && exec bash -il`,
      ],
      env: { TERM: "xterm-256color", COLORTERM: "truecolor" },
    };
  }

  run(command: string, args: string[], cwd = homedir()) {
    const spec = this.spawn(command, args, cwd);
    return runCommand([spec.file, ...spec.args]);
  }
}
