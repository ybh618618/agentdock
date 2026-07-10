import { existsSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join, resolve } from "node:path";

function envPath(value: string | undefined, fallback: string): string {
  return resolve(value?.trim() || fallback);
}

const repoRoot = resolve(import.meta.dir, "../../..");
const packaged = process.env.AGENTDOCK_PACKAGED === "1";

export const config = {
  host: process.env.AGENTDOCK_HOST || "127.0.0.1",
  port: Number.parseInt(process.env.AGENTDOCK_PORT || "41730", 10),
  dataDir: envPath(
    process.env.AGENTDOCK_DATA_DIR,
    platform() === "win32"
      ? join(process.env.LOCALAPPDATA || homedir(), "AgentDock")
      : join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "agentdock"),
  ),
  containerName: process.env.AGENTDOCK_CONTAINER_NAME || "agentdock-ubuntu",
  distroName: process.env.AGENTDOCK_DISTRO_NAME || "AgentDock",
  image: process.env.AGENTDOCK_IMAGE || "docker.io/library/ubuntu:26.04",
  directMode: process.env.AGENTDOCK_DEV_DIRECT === "1",
  runtimeKind: process.env.AGENTDOCK_RUNTIME_KIND || "",
  dashboardDist:
    process.env.AGENTDOCK_DASHBOARD_DIR ||
    (packaged ? "/usr/lib/agentdock/dashboard" : resolve(import.meta.dir, "../../dashboard/dist")),
  repoRoot,
  runtimeAssets:
    process.env.AGENTDOCK_RUNTIME_DIR ||
    (packaged && existsSync("/usr/lib/agentdock/runtime")
      ? "/usr/lib/agentdock/runtime"
      : join(repoRoot, "packaging", "linux", "runtime")),
} as const;

export const paths = {
  state: join(config.dataDir, "state.json"),
  stateTemp: join(config.dataDir, "state.json.tmp"),
  logs: join(config.dataDir, "logs"),
  projects: join(homedir(), "project"),
};
