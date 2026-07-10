import { agentIds } from "@agentdock/shared";
import { describe, expect, test } from "vitest";

describe("dashboard contract", () => {
  test("offers every runtime agent in the shared catalog", () => {
    expect(agentIds).toContain("codex");
    expect(agentIds).toContain("claude");
    expect(agentIds).toContain("antigravity");
    expect(agentIds).toContain("opencode");
  });
});
