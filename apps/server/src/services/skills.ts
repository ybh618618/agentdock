import type { AgentId } from "@agentdock/shared";
import { runtime } from "../runtime";

const skillsAgent: Record<AgentId, string> = {
  codex: "codex",
  claude: "claude-code",
  antigravity: "antigravity-cli",
  opencode: "opencode",
};

export async function installSkill(options: {
  source: string;
  cwd: string;
  agents: AgentId[];
  global: boolean;
}): Promise<void> {
  if (!options.source.trim()) throw new Error("Skill 来源不能为空");
  const args = ["skills@1.5.15", "add", options.source.trim()];
  if (options.global) args.push("--global");
  args.push("--agent", ...options.agents.map((id) => skillsAgent[id]), "--yes", "--copy");
  const result = await runtime.run("bunx", args, options.cwd);
  if (result.exitCode !== 0) throw new Error(result.stderr || result.stdout || "Skill 安装失败");
}
