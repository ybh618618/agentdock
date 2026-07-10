import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { hostname, platform } from "node:os";
import { dirname } from "node:path";
import type {
  AgentId,
  AppSettings,
  AppState,
  Project,
  RuntimeInfo,
  Session,
} from "@agentdock/shared";
import { agentIds } from "@agentdock/shared";
import { agentDefinitions } from "./agents/catalog";
import { config, paths } from "./config";

interface PersistedState {
  schemaVersion: 2;
  settings: AppSettings;
  runtime: RuntimeInfo;
  projects: Project[];
  sessions: Session[];
  installedAgents: AgentId[];
}

const defaultSettings: AppSettings = {
  onboardingComplete: false,
  enabledAgents: ["codex", "claude"],
  aptMirror: "http://archive.ubuntu.com/ubuntu",
  theme: "system",
  locale: "zh-CN",
  autoUpdatePackages: true,
  skillSource: "ybh618618/agentdock",
};

function defaultRuntime(): RuntimeInfo {
  return {
    platform: config.directMode
      ? "direct"
      : config.runtimeKind === "wsl" || platform() === "win32"
        ? "windows-wsl"
        : "linux-distrobox",
    status: config.directMode ? "ready" : "missing",
    containerName: platform() === "win32" ? config.distroName : config.containerName,
    distribution: "Ubuntu 26.04",
    message: config.directMode ? `开发直连模式 · ${hostname()}` : "等待运行时检测",
  };
}

function defaults(): PersistedState {
  return {
    schemaVersion: 2,
    settings: defaultSettings,
    runtime: defaultRuntime(),
    projects: [],
    sessions: [],
    installedAgents: [],
  };
}

function migrateAgentId(id: unknown): AgentId | undefined {
  const migrated = id === "gemini" ? "antigravity" : id;
  return typeof migrated === "string" && agentIds.includes(migrated as AgentId)
    ? (migrated as AgentId)
    : undefined;
}

function migrateAgentIds(ids: unknown): AgentId[] {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.map(migrateAgentId).filter((id): id is AgentId => Boolean(id)))];
}

export function normalizePersistedState(raw: Partial<PersistedState>): PersistedState {
  const settings = { ...defaultSettings, ...(raw.settings || {}) };
  const enabledAgents = migrateAgentIds(settings.enabledAgents);
  return {
    schemaVersion: 2,
    settings: { ...settings, enabledAgents },
    runtime: { ...defaultRuntime(), ...(raw.runtime || {}) },
    projects: Array.isArray(raw.projects)
      ? raw.projects.map((project) => ({
          ...project,
          agentIds: migrateAgentIds(project.agentIds),
        }))
      : [],
    sessions: Array.isArray(raw.sessions)
      ? raw.sessions.flatMap((session) => {
          const agentId = migrateAgentId(session.agentId);
          return agentId ? [{ ...session, agentId, kind: session.kind || "agent" }] : [];
        })
      : [],
    installedAgents: migrateAgentIds(raw.installedAgents),
  };
}

export class StateStore {
  #state: PersistedState = defaults();
  #writeQueue = Promise.resolve();

  async init(): Promise<void> {
    await mkdir(dirname(paths.state), { recursive: true });
    await mkdir(paths.logs, { recursive: true });
    try {
      this.#state = normalizePersistedState(
        JSON.parse(await readFile(paths.state, "utf8")) as PersistedState,
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        const backup = `${paths.state}.invalid-${Date.now()}`;
        await rename(paths.state, backup).catch(() => undefined);
        console.warn(`State file was invalid and moved to ${backup}`);
      }
      this.#state = defaults();
      await this.#persist();
    }

    this.#state.sessions = this.#state.sessions.map((session) =>
      session.status === "running" || session.status === "starting"
        ? { ...session, status: "stopped", updatedAt: new Date().toISOString() }
        : session,
    );
    await this.#persist();
  }

  snapshot(): AppState {
    return structuredClone({
      ...this.#state,
      agents: agentDefinitions(
        this.#state.settings.enabledAgents,
        new Set(this.#state.installedAgents),
      ),
      version: "0.1.0",
    });
  }

  async mutate(mutator: (state: PersistedState) => void): Promise<AppState> {
    mutator(this.#state);
    await this.#persist();
    return this.snapshot();
  }

  async updateRuntime(patch: Partial<RuntimeInfo>): Promise<RuntimeInfo> {
    await this.mutate((state) => {
      state.runtime = { ...state.runtime, ...patch };
    });
    return structuredClone(this.#state.runtime);
  }

  async #persist(): Promise<void> {
    const serialized = JSON.stringify(this.#state, null, 2);
    this.#writeQueue = this.#writeQueue.then(async () => {
      await writeFile(paths.stateTemp, serialized, { mode: 0o600 });
      await rename(paths.stateTemp, paths.state);
    });
    await this.#writeQueue;
  }
}

export const store = new StateStore();
