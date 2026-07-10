import type { AgentDefinition, AgentId } from "@agentdock/shared";

export interface AgentAdapter extends Omit<AgentDefinition, "enabled" | "installed"> {
  executable: string;
  args: string[];
  skillsAgent: string;
  env?: Record<string, string>;
}

export const agentCatalog: Record<AgentId, AgentAdapter> = {
  codex: {
    id: "codex",
    name: "Codex",
    description: "OpenAI 的本地编码 Agent，适合自主实现、调试与代码审查。",
    executable: "codex",
    command: "codex --dangerously-bypass-approvals-and-sandbox",
    args: ["--dangerously-bypass-approvals-and-sandbox"],
    installCommand: "curl -fsSL https://chatgpt.com/codex/install.sh | sh",
    configCommand: "codex login --device-auth",
    skillDirectory: "~/.agents/skills（兼容 ~/.codex/skills）",
    skillsAgent: "codex",
  },
  claude: {
    id: "claude",
    name: "Claude Code",
    description: "Anthropic 的终端编码 Agent，支持项目级记忆与 Skills。",
    executable: "claude",
    command: "claude --dangerously-skip-permissions",
    args: ["--dangerously-skip-permissions"],
    installCommand: "apt install claude-code（官方签名仓库）",
    configCommand: "claude auth login",
    skillDirectory: "~/.claude/skills",
    skillsAgent: "claude-code",
  },
  antigravity: {
    id: "antigravity",
    name: "Antigravity CLI",
    description: "Google 的新一代终端 Agent，与 Antigravity IDE 共享 Agent 引擎。",
    executable: "agy",
    command: "agy --dangerously-skip-permissions --sandbox=false",
    args: ["--dangerously-skip-permissions", "--sandbox=false"],
    installCommand: "curl -fsSL https://antigravity.google/cli/install.sh | bash",
    configCommand: "agy",
    skillDirectory: "~/.gemini/antigravity-cli/skills",
    skillsAgent: "antigravity-cli",
    availabilityNote: "首次运行会打开浏览器完成 Google 登录；远程环境会显示授权链接。",
  },
  opencode: {
    id: "opencode",
    name: "OpenCode",
    description: "开放的多模型终端 Agent，可接入不同推理服务。",
    executable: "opencode",
    command: "opencode --auto",
    args: ["--auto"],
    installCommand: "bun add --global opencode-ai",
    configCommand: "opencode auth login",
    skillDirectory: "~/.config/opencode/skills",
    skillsAgent: "opencode",
    env: { OPENCODE_CONFIG_CONTENT: '{"permission":"allow"}' },
  },
};

export function agentDefinitions(
  enabled: AgentId[],
  installed: Set<AgentId> = new Set(),
): AgentDefinition[] {
  return Object.values(agentCatalog).map((agent) => ({
    ...agent,
    enabled: enabled.includes(agent.id),
    installed: installed.has(agent.id),
  }));
}
