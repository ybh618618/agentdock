import { describe, expect, test } from "bun:test";
import { agentIds } from "./index";

describe("shared agent ids", () => {
  test("keeps the supported agent catalog stable", () => {
    expect(agentIds).toEqual(["codex", "claude", "antigravity", "opencode"]);
  });
});
