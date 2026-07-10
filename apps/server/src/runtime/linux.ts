import { homedir } from "node:os";
import type { RuntimeInfo } from "@agentdock/shared";
import { config } from "../config";
import { commandExists, quoteShell, runCommand } from "../lib/command";
import type { RuntimeAdapter, SpawnSpec } from "./types";

export class LinuxDistroboxRuntime implements RuntimeAdapter {
  readonly kind = "linux-distrobox" as const;

  async inspect(): Promise<RuntimeInfo> {
    if (!(await commandExists("podman")) || !(await commandExists("distrobox"))) {
      return {
        platform: this.kind,
        status: "missing",
        containerName: config.containerName,
        distribution: "Ubuntu 26.04",
        message: "需要先在宿主机安装 Podman 与 Distrobox",
      };
    }

    const result = await runCommand(["distrobox", "list", "--no-color"]);
    const exists =
      result.exitCode === 0 &&
      result.stdout.split("\n").some((line) => line.includes(config.containerName));
    return {
      platform: this.kind,
      status: exists ? "ready" : "missing",
      containerName: config.containerName,
      distribution: "Ubuntu 26.04",
      message: exists ? "Podman · Distrobox" : "容器尚未创建",
      packageUpdateLog: exists ? await this.readUpdateLog() : undefined,
    };
  }

  async ensure(options: { aptMirror: string; autoUpdate: boolean }): Promise<RuntimeInfo> {
    const inspected = await this.inspect();
    if (inspected.message?.includes("宿主机安装")) return inspected;

    if (inspected.status === "missing") {
      // The provisioner performs rootless Podman preflight, pulls the image,
      // creates the persistent Distrobox home and starts the first hook.
    }

    const provision = await runCommand([`${config.runtimeAssets}/provision.sh`], {
      env: { AGENTDOCK_APT_MIRROR: options.aptMirror },
      timeoutMs: 30 * 60_000,
    });
    if (provision.exitCode !== 0) {
      throw new Error(provision.stderr || provision.stdout || "容器初始化失败");
    }
    if (options.autoUpdate) void this.updatePackages();
    return this.inspect();
  }

  async reset(): Promise<void> {
    const result = await runCommand([`${config.runtimeAssets}/reset.sh`, "--confirm"]);
    if (result.exitCode !== 0 && !result.stderr.includes("could not find")) {
      throw new Error(result.stderr || result.stdout || "无法重置 Distrobox");
    }
  }

  async updatePackages(): Promise<void> {
    await runCommand([
      "distrobox",
      "enter",
      "--name",
      config.containerName,
      "--",
      "/opt/agentdock-bootstrap/runtime/container-start.sh",
    ]);
  }

  spawn(command: string, args: string[], cwd: string): SpawnSpec {
    const commandLine = [command, ...args].map(quoteShell).join(" ");
    return {
      file: "distrobox",
      args: [
        "enter",
        "--name",
        config.containerName,
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
      file: "distrobox",
      args: [
        "enter",
        "--name",
        config.containerName,
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

  private async readUpdateLog(): Promise<string | undefined> {
    const result = await runCommand(
      [
        "distrobox",
        "enter",
        "--name",
        config.containerName,
        "--",
        "tail",
        "-c",
        "4000",
        "/var/log/agentdock/apt-update.log",
      ],
      { timeoutMs: 5_000 },
    );
    return result.exitCode === 0 ? result.stdout : undefined;
  }
}
