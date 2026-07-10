export const agentIds = ["codex", "claude", "antigravity", "opencode"] as const;

export type AgentId = (typeof agentIds)[number];
export type ThemePreference = "system" | "light" | "dark";
export type RuntimePlatform = "linux-distrobox" | "windows-wsl" | "direct";
export type RuntimeStatus = "missing" | "pulling" | "provisioning" | "ready" | "updating" | "error";

export interface AgentDefinition {
  id: AgentId;
  name: string;
  description: string;
  command: string;
  installCommand: string;
  configCommand: string;
  skillDirectory: string;
  enabled: boolean;
  installed: boolean;
  availabilityNote?: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  skills: string[];
  agentIds: AgentId[];
  agentsMd: string;
}

export interface Session {
  id: string;
  projectId: string;
  agentId: AgentId;
  kind: "agent" | "shell" | "configuration";
  title: string;
  status: "starting" | "running" | "stopped" | "failed";
  createdAt: string;
  updatedAt: string;
  initialPrompt?: string;
  exitCode?: number;
}

export interface AppSettings {
  onboardingComplete: boolean;
  enabledAgents: AgentId[];
  aptMirror: string;
  theme: ThemePreference;
  locale: "zh-CN" | "en-US";
  autoUpdatePackages: boolean;
  skillSource: string;
}

export interface RuntimeInfo {
  platform: RuntimePlatform;
  status: RuntimeStatus;
  containerName: string;
  distribution: string;
  lastPackageUpdate?: string;
  packageUpdateLog?: string;
  message?: string;
}

export interface AppState {
  settings: AppSettings;
  runtime: RuntimeInfo;
  agents: AgentDefinition[];
  projects: Project[];
  sessions: Session[];
  version: string;
}

export interface CreateProjectInput {
  name: string;
  path?: string;
  initialPrompt?: string;
}

export interface CreateSessionInput {
  agentId: AgentId;
  title?: string;
  initialPrompt?: string;
  kind?: "agent" | "shell";
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

export interface TerminalClientMessage {
  type: "input" | "resize";
  data?: string;
  cols?: number;
  rows?: number;
}

export interface TerminalServerMessage {
  type: "output" | "exit" | "ready" | "error";
  data?: string;
  code?: number;
}
