import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import type {
  AgentId,
  AppSettings,
  CreateProjectInput,
  CreateSessionInput,
  Project,
  Session,
} from "@agentdock/shared";
import { agentIds } from "@agentdock/shared";
import { paths } from "./config";
import { apiError, HttpError, json, readJson } from "./lib/http";
import { runtime } from "./runtime";
import { ensureRuntime, installAgents, refreshRuntime, resetRuntime } from "./services/lifecycle";
import { installSkill } from "./services/skills";
import { store } from "./store";
import { terminals } from "./terminals";

type SettingsPatch = Partial<AppSettings>;
type ProjectPatch = Partial<Pick<Project, "name" | "path" | "skills" | "agentIds" | "agentsMd">>;

export async function handleApi(request: Request, url: URL): Promise<Response | undefined> {
  if (!url.pathname.startsWith("/api/")) return undefined;
  try {
    if (request.method === "GET" && url.pathname === "/api/state") return json(store.snapshot());

    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({ status: "ok", version: "0.1.0" });
    }

    if (request.method === "POST" && url.pathname === "/api/onboarding") {
      const patch = await readJson<SettingsPatch>(request);
      validateSettings(patch);
      const state = await store.mutate((draft) => {
        draft.settings = { ...draft.settings, ...patch, onboardingComplete: true };
      });
      void ensureRuntime().catch((error) => console.error("Runtime onboarding failed", error));
      return json(state, { status: 202 });
    }

    if (request.method === "PATCH" && url.pathname === "/api/settings") {
      const patch = await readJson<SettingsPatch>(request);
      validateSettings(patch);
      const state = await store.mutate((draft) => {
        draft.settings = { ...draft.settings, ...patch };
      });
      return json(state);
    }

    if (request.method === "POST" && url.pathname === "/api/agents/install") {
      const body = await readJson<{ agentIds: AgentId[] }>(request);
      const selected = validateAgentIds(body.agentIds);
      void installAgents(selected).catch((error) => console.error("Agent install failed", error));
      return json({ accepted: true }, { status: 202 });
    }

    if (request.method === "POST" && url.pathname === "/api/runtime/ensure") {
      void ensureRuntime().catch((error) => console.error("Runtime ensure failed", error));
      return json({ accepted: true }, { status: 202 });
    }

    if (request.method === "POST" && url.pathname === "/api/runtime/refresh") {
      await refreshRuntime();
      return json(store.snapshot().runtime);
    }

    if (request.method === "POST" && url.pathname === "/api/runtime/update") {
      await store.updateRuntime({ status: "updating", message: "正在后台更新 apt 软件包" });
      void runtime
        .updatePackages()
        .then(() =>
          store.updateRuntime({
            status: "ready",
            message: "软件包更新已在后台启动",
            lastPackageUpdate: new Date().toISOString(),
          }),
        )
        .catch((error) => store.updateRuntime({ status: "error", message: String(error) }));
      return json({ accepted: true }, { status: 202 });
    }

    if (request.method === "DELETE" && url.pathname === "/api/runtime") {
      void resetRuntime().catch((error) => console.error("Runtime reset failed", error));
      return json({ accepted: true }, { status: 202 });
    }

    if (request.method === "GET" && url.pathname === "/api/fs/suggest-name") {
      const path = url.searchParams.get("path")?.trim();
      return json({ name: path ? basename(path.replace(/[\\/]+$/, "")) : "" });
    }

    if (request.method === "POST" && url.pathname === "/api/projects") {
      const body = await readJson<CreateProjectInput>(request);
      const name = body.name?.trim();
      if (!name) throw new HttpError(400, "name_required", "项目名称不能为空");
      const now = new Date().toISOString();
      const projectPath = body.path?.trim()
        ? resolve(body.path.trim())
        : join(paths.projects, slugify(name) || `project-${Date.now()}`);
      await mkdir(projectPath, { recursive: true });
      const project: Project = {
        id: crypto.randomUUID(),
        name,
        path: projectPath,
        createdAt: now,
        updatedAt: now,
        skills: [],
        agentIds: [...store.snapshot().settings.enabledAgents],
        agentsMd: "",
      };
      await store.mutate((draft) => {
        draft.projects.push(project);
      });
      return json({ project, initialPrompt: body.initialPrompt }, { status: 201 });
    }

    const projectMatch = url.pathname.match(/^\/api\/projects\/([^/]+)$/);
    if (projectMatch) {
      const id = decodeURIComponent(projectMatch[1] || "");
      const project = findProject(id);
      if (request.method === "PATCH") {
        const patch = await readJson<ProjectPatch>(request);
        if (patch.name !== undefined && !patch.name.trim()) {
          throw new HttpError(400, "name_required", "项目名称不能为空");
        }
        if (patch.agentIds) validateAgentIds(patch.agentIds);
        const nextPath = patch.path?.trim() ? resolve(patch.path.trim()) : undefined;
        if (nextPath) await mkdir(nextPath, { recursive: true });
        const updatedAt = new Date().toISOString();
        await store.mutate((draft) => {
          const current = draft.projects.find((item) => item.id === id);
          if (!current) return;
          Object.assign(current, patch, nextPath ? { path: nextPath } : {}, {
            name: patch.name?.trim() || current.name,
            updatedAt,
          });
        });
        const updated = findProject(id);
        if (patch.agentsMd !== undefined) {
          await writeFile(join(updated.path, "AGENTS.md"), patch.agentsMd, "utf8");
          await writeFile(
            join(updated.path, "CLAUDE.md"),
            "# Claude Code instructions\n\nUse the project-wide instructions in [AGENTS.md](./AGENTS.md).\n",
            "utf8",
          );
        }
        return json(updated);
      }
      if (request.method === "DELETE") {
        for (const session of store.snapshot().sessions.filter((item) => item.projectId === id)) {
          terminals.stop(session.id);
        }
        await store.mutate((draft) => {
          draft.projects = draft.projects.filter((item) => item.id !== id);
          draft.sessions = draft.sessions.filter((item) => item.projectId !== id);
        });
        return new Response(null, { status: 204 });
      }
      if (request.method === "GET") return json(project);
    }

    const sessionsMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/sessions$/);
    if (sessionsMatch && request.method === "POST") {
      const project = findProject(decodeURIComponent(sessionsMatch[1] || ""));
      const body = await readJson<CreateSessionInput>(request);
      const now = new Date().toISOString();
      const kind = body.kind || "agent";
      const agentId = kind === "shell" ? "codex" : validateAgentIds([body.agentId])[0];
      if (!agentId) throw new HttpError(400, "agent_required", "请选择一个 Agent");
      if (kind === "agent" && !project.agentIds.includes(agentId)) {
        throw new HttpError(400, "agent_not_enabled", "该 Agent 未在项目中启用");
      }
      const session: Session = {
        id: crypto.randomUUID(),
        projectId: project.id,
        agentId,
        kind,
        title:
          body.title?.trim() ||
          deriveTitle(body.initialPrompt, kind === "shell" ? "项目终端" : "新对话"),
        status: "starting",
        createdAt: now,
        updatedAt: now,
        initialPrompt: body.initialPrompt?.trim() || undefined,
      };
      await store.mutate((draft) => draft.sessions.push(session));
      try {
        if (kind === "shell") await terminals.startShell(session, project.path);
        else await terminals.startAgent(session, project.path);
      } catch (error) {
        throw new HttpError(500, "terminal_start_failed", "终端启动失败", String(error));
      }
      return json(session, { status: 201 });
    }

    const configMatch = url.pathname.match(/^\/api\/agents\/([^/]+)\/configure$/);
    if (configMatch && request.method === "POST") {
      const agentId = validateAgentIds([configMatch[1] as AgentId])[0];
      if (!agentId) throw new HttpError(400, "invalid_agent", "未知 Agent");
      const now = new Date().toISOString();
      const session: Session = {
        id: crypto.randomUUID(),
        projectId: "__settings__",
        agentId,
        kind: "configuration",
        title: `配置 ${agentId}`,
        status: "starting",
        createdAt: now,
        updatedAt: now,
      };
      await store.mutate((draft) => draft.sessions.push(session));
      await terminals.startConfiguration(session, agentId);
      return json(session, { status: 201 });
    }

    const sessionMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)$/);
    if (sessionMatch) {
      const id = decodeURIComponent(sessionMatch[1] || "");
      const session = findSession(id);
      if (request.method === "DELETE") {
        terminals.stop(id);
        await store.mutate((draft) => {
          draft.sessions = draft.sessions.filter((item) => item.id !== id);
        });
        return new Response(null, { status: 204 });
      }
      if (request.method === "GET") return json(session);
    }

    const restartMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/restart$/);
    if (restartMatch && request.method === "POST") {
      const session = findSession(decodeURIComponent(restartMatch[1] || ""));
      const project = findProject(session.projectId);
      if (session.kind === "shell") await terminals.startShell(session, project.path);
      else await terminals.startAgent(session, project.path);
      return json(findSession(session.id));
    }

    if (request.method === "POST" && url.pathname === "/api/skills/install") {
      const body = await readJson<{
        source: string;
        projectId?: string;
        agents: AgentId[];
        global?: boolean;
      }>(request);
      const agents = validateAgentIds(body.agents);
      const project = body.projectId ? findProject(body.projectId) : undefined;
      await installSkill({
        source: body.source,
        agents,
        global: Boolean(body.global),
        cwd: project?.path || paths.projects,
      });
      if (project && !project.skills.includes(body.source)) {
        await store.mutate((draft) => {
          const current = draft.projects.find((item) => item.id === project.id);
          if (current) current.skills.push(body.source);
        });
      }
      return json({ installed: true });
    }

    return apiError(404, "not_found", "API 路径不存在");
  } catch (error) {
    if (error instanceof HttpError)
      return apiError(error.status, error.code, error.message, error.details);
    console.error(error);
    return apiError(500, "internal_error", "服务器处理请求时发生错误");
  }
}

function validateSettings(patch: SettingsPatch): void {
  if (patch.enabledAgents) validateAgentIds(patch.enabledAgents);
  if (patch.aptMirror !== undefined) {
    try {
      const mirror = new URL(patch.aptMirror);
      if (!["http:", "https:"].includes(mirror.protocol)) throw new Error();
    } catch {
      throw new HttpError(400, "invalid_apt_mirror", "apt 镜像必须是有效的 HTTP(S) 地址");
    }
  }
  if (patch.locale && !["zh-CN", "en-US"].includes(patch.locale)) {
    throw new HttpError(400, "invalid_locale", "不支持的界面语言");
  }
}

function validateAgentIds(ids: AgentId[] | undefined): AgentId[] {
  if (!Array.isArray(ids)) throw new HttpError(400, "invalid_agents", "Agent 列表无效");
  const unique = [...new Set(ids)];
  if (unique.some((id) => !agentIds.includes(id))) {
    throw new HttpError(400, "invalid_agent", "包含不支持的 Agent");
  }
  return unique;
}

function findProject(id: string): Project {
  const project = store.snapshot().projects.find((item) => item.id === id);
  if (!project) throw new HttpError(404, "project_not_found", "找不到该项目");
  return project;
}

function findSession(id: string): Session {
  const session = store.snapshot().sessions.find((item) => item.id === id);
  if (!session) throw new HttpError(404, "session_not_found", "找不到该会话");
  return session;
}

function slugify(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function deriveTitle(prompt: string | undefined, fallback: string): string {
  const normalized = prompt?.trim().replace(/\s+/g, " ");
  if (!normalized) return fallback;
  return normalized.length > 32 ? `${normalized.slice(0, 32)}…` : normalized;
}
