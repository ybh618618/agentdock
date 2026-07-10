import { homedir } from "node:os";
import type { RuntimeInfo } from "@agentdock/shared";
import { runCommand } from "../lib/command";
import type { RuntimeAdapter, SpawnSpec } from "./types";

export class WslNativeRuntime implements RuntimeAdapter {
  readonly kind = "windows-wsl" as const;

  async inspect(): Promise<RuntimeInfo> {
    const update = await runCommand(
      ["systemctl", "show", "agentdock-apt-update.service", "--property=ActiveState", "--value"],
      { timeoutMs: 3_000 },
    );
    return {
      platform: this.kind,
      status: update.exitCode === 0 && update.stdout.trim() === "active" ? "updating" : "ready",
      containerName: "AgentDock",
      distribution: "Ubuntu 26.04",
      message: "WSL 2 · 原生 Ubuntu 运行时",
    };
  }

  async ensure(): Promise<RuntimeInfo> {
    return this.inspect();
  }

  async reset(): Promise<void> {
    throw new Error("WSL 完整重置需要从 Windows 执行 wsl --unregister；请先导出项目备份");
  }

  async updatePackages(): Promise<void> {
    const result = await runCommand([
      "sudo",
      "-n",
      "systemctl",
      "restart",
      "agentdock-apt-update.service",
    ]);
    if (result.exitCode !== 0) throw new Error(result.stderr || "无法启动 WSL apt 更新服务");
  }

  spawn(command: string, args: string[], cwd: string): SpawnSpec {
    return {
      file: command,
      args,
      cwd,
      env: { TERM: "xterm-256color", COLORTERM: "truecolor" },
    };
  }

  spawnShell(cwd: string): SpawnSpec {
    return this.spawn(process.env.SHELL || "/bin/bash", ["-il"], cwd);
  }

  run(command: string, args: string[], cwd = homedir()) {
    return runCommand([command, ...args], { cwd });
  }
}
