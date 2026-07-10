import { hostname } from "node:os";
import type { RuntimeInfo } from "@agentdock/shared";
import { runCommand } from "../lib/command";
import type { RuntimeAdapter, SpawnSpec } from "./types";

export class DirectRuntime implements RuntimeAdapter {
  readonly kind = "direct" as const;

  async inspect(): Promise<RuntimeInfo> {
    return {
      platform: this.kind,
      status: "ready",
      containerName: "direct-development",
      distribution: `${process.platform} · ${hostname()}`,
      message: "仅用于开发：命令直接在宿主机执行",
    };
  }

  async ensure(): Promise<RuntimeInfo> {
    return this.inspect();
  }

  async reset(): Promise<void> {
    // Direct mode intentionally owns no environment to reset.
  }

  async updatePackages(): Promise<void> {
    // Never mutate the host from development mode.
  }

  spawn(command: string, args: string[], cwd: string): SpawnSpec {
    return { file: command, args, cwd, env: { TERM: "xterm-256color", COLORTERM: "truecolor" } };
  }

  spawnShell(cwd: string): SpawnSpec {
    return this.spawn(process.env.SHELL || "/bin/bash", ["-il"], cwd);
  }

  run(command: string, args: string[], cwd?: string) {
    return runCommand([command, ...args], { cwd });
  }
}
