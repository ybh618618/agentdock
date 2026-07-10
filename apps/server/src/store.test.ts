import { describe, expect, test } from "bun:test";
import { normalizePersistedState } from "./store";

describe("persisted state contract", () => {
  test("uses a local-only application data directory by default", async () => {
    const { config } = await import("./config");
    expect(config.dataDir).toContain("agentdock");
  });

  test("migrates persisted Gemini CLI references to Antigravity CLI", () => {
    const state = normalizePersistedState({
      settings: { enabledAgents: ["gemini", "codex"] },
      projects: [{ id: "project", agentIds: ["gemini"] }],
      sessions: [{ id: "session", agentId: "gemini" }],
      installedAgents: ["gemini"],
    } as never);

    expect(state.settings.enabledAgents).toEqual(["antigravity", "codex"]);
    expect(state.projects[0]?.agentIds).toEqual(["antigravity"]);
    expect(state.sessions[0]?.agentId).toBe("antigravity");
    expect(state.installedAgents).toEqual(["antigravity"]);
  });
});
