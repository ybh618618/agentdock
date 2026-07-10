import type {
  AgentId,
  AppSettings,
  AppState,
  CreateProjectInput,
  CreateSessionInput,
  Project,
  Session,
} from "@agentdock/shared";

class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init?.body ? { "content-type": "application/json", ...init.headers } : init?.headers,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as
      | { error?: string; code?: string }
      | undefined;
    throw new ApiClientError(
      body?.error || `请求失败 (${response.status})`,
      body?.code || "request_failed",
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  state: () => request<AppState>("/api/state"),
  onboarding: (settings: Partial<AppSettings>) =>
    request<AppState>("/api/onboarding", { method: "POST", body: JSON.stringify(settings) }),
  updateSettings: (settings: Partial<AppSettings>) =>
    request<AppState>("/api/settings", { method: "PATCH", body: JSON.stringify(settings) }),
  createProject: (input: CreateProjectInput) =>
    request<{ project: Project; initialPrompt?: string }>("/api/projects", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateProject: (id: string, input: Partial<Project>) =>
    request<Project>(`/api/projects/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteProject: (id: string) =>
    request<void>(`/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" }),
  createSession: (projectId: string, input: CreateSessionInput) =>
    request<Session>(`/api/projects/${encodeURIComponent(projectId)}/sessions`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  restartSession: (sessionId: string) =>
    request<Session>(`/api/sessions/${encodeURIComponent(sessionId)}/restart`, { method: "POST" }),
  deleteSession: (sessionId: string) =>
    request<void>(`/api/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" }),
  configureAgent: (agentId: AgentId) =>
    request<Session>(`/api/agents/${agentId}/configure`, { method: "POST" }),
  installAgents: (agentIds: AgentId[]) =>
    request<{ accepted: true }>("/api/agents/install", {
      method: "POST",
      body: JSON.stringify({ agentIds }),
    }),
  ensureRuntime: () => request<{ accepted: true }>("/api/runtime/ensure", { method: "POST" }),
  updateRuntime: () => request<{ accepted: true }>("/api/runtime/update", { method: "POST" }),
  resetRuntime: () => request<{ accepted: true }>("/api/runtime", { method: "DELETE" }),
  installSkill: (input: {
    source: string;
    projectId?: string;
    agents: AgentId[];
    global?: boolean;
  }) =>
    request<{ installed: true }>("/api/skills/install", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};

export { ApiClientError };
