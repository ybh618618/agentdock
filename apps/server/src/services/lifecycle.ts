import type { AgentId } from "@agentdock/shared";
import { runtime } from "../runtime";
import { store } from "../store";

let operation: Promise<void> = Promise.resolve();

export function refreshRuntime(): Promise<void> {
  return serialize(async () => {
    const info = await runtime.inspect();
    await store.updateRuntime(info);
    if (info.status === "ready" && store.snapshot().settings.autoUpdatePackages) {
      await store.updateRuntime({ status: "updating", message: "后台更新 apt 软件包索引" });
      await runtime.updatePackages();
      await store.updateRuntime({
        status: "ready",
        message: info.message,
        lastPackageUpdate: new Date().toISOString(),
      });
    }
  });
}

export function ensureRuntime(): Promise<void> {
  return serialize(async () => {
    const settings = store.snapshot().settings;
    await store.updateRuntime({ status: "pulling", message: "正在拉取 Ubuntu 26.04 运行环境" });
    try {
      await store.updateRuntime({
        status: "provisioning",
        message: "正在配置 apt、Bun 与开发工具",
      });
      const result = await runtime.ensure({
        aptMirror: settings.aptMirror,
        autoUpdate: settings.autoUpdatePackages,
      });
      await store.updateRuntime(result);
      if (result.status === "ready") {
        await probeInstalledAgents();
        await installEnvironmentSkill(settings.enabledAgents);
      }
    } catch (error) {
      await store.updateRuntime({
        status: "error",
        message: error instanceof Error ? error.message : "运行时初始化失败",
      });
      throw error;
    }
  });
}

export function resetRuntime(): Promise<void> {
  return serialize(async () => {
    await store.updateRuntime({ status: "provisioning", message: "正在移除现有运行环境" });
    try {
      await runtime.reset();
      await store.updateRuntime({ status: "missing", message: "环境已重置，可重新初始化" });
    } catch (error) {
      await store.updateRuntime({
        status: "error",
        message: error instanceof Error ? error.message : "环境重置失败",
      });
      throw error;
    }
  });
}

export async function installEnvironmentSkill(agentIds: AgentId[]): Promise<void> {
  if (agentIds.length === 0) return;
  const { skillSource } = store.snapshot().settings;
  const skillsAgents = agentIds.map((id) => {
    if (id === "claude") return "claude-code";
    if (id === "antigravity") return "antigravity-cli";
    return id;
  });
  const result = await runtime.run("bunx", [
    "skills@1.5.15",
    "add",
    skillSource,
    "--global",
    "--skill",
    "environment-manager",
    "--agent",
    ...skillsAgents,
    "--yes",
    "--copy",
  ]);
  if (result.exitCode !== 0) {
    console.warn("Environment skill installation failed:", result.stderr || result.stdout);
  }
}

export function installAgents(agentIds: AgentId[]): Promise<void> {
  return serialize(async () => {
    const { agentCatalog } = await import("../agents/catalog");
    for (const id of agentIds) {
      const adapter = agentCatalog[id];
      const installer =
        runtime.kind === "linux-distrobox"
          ? "/opt/agentdock-bootstrap/runtime/install-agent"
          : "/usr/lib/agentdock/runtime/install-agent";
      const result = await runtime.run(installer, [id]);
      if (result.exitCode !== 0) {
        throw new Error(`${adapter.name} 安装失败：${result.stderr || result.stdout}`);
      }
      await store.mutate((state) => {
        if (!state.installedAgents.includes(id)) state.installedAgents.push(id);
      });
    }
    await installEnvironmentSkill(agentIds);
  });
}

function serialize(task: () => Promise<void>): Promise<void> {
  const next = operation.then(task, task);
  operation = next.catch(() => undefined);
  return next;
}

async function probeInstalledAgents(): Promise<void> {
  const { agentCatalog } = await import("../agents/catalog");
  const installed: AgentId[] = [];
  for (const [id, adapter] of Object.entries(agentCatalog) as [
    AgentId,
    (typeof agentCatalog)[AgentId],
  ][]) {
    const result = await runtime.run("which", [adapter.executable]);
    if (result.exitCode === 0) installed.push(id);
  }
  await store.mutate((state) => {
    state.installedAgents = installed;
  });
}
