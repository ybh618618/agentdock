import { describe, expect, test } from "bun:test";
import { agentCatalog, agentDefinitions } from "./catalog";

describe("agent catalog", () => {
  test("every supported agent launches in explicit full-permission mode", () => {
    expect(agentCatalog.codex.args).toContain("--dangerously-bypass-approvals-and-sandbox");
    expect(agentCatalog.claude.args).toContain("--dangerously-skip-permissions");
    expect(agentCatalog.antigravity.args).toContain("--dangerously-skip-permissions");
    expect(agentCatalog.antigravity.args).toContain("--sandbox=false");
    expect(agentCatalog.opencode.args).toContain("--auto");
    expect(agentCatalog.opencode.env?.OPENCODE_CONFIG_CONTENT).toContain("allow");
  });

  test("projects only expose enabled agents", () => {
    const definitions = agentDefinitions(["codex", "antigravity"]);
    expect(definitions.filter((agent) => agent.enabled).map((agent) => agent.id)).toEqual([
      "codex",
      "antigravity",
    ]);
  });
});
