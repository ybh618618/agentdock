import { homedir } from "node:os";
import type { AgentId, Session, TerminalServerMessage } from "@agentdock/shared";
import { agentCatalog } from "./agents/catalog";
import { runtime } from "./runtime";
import type { SpawnSpec } from "./runtime/types";
import { store } from "./store";

type Subscriber = (message: TerminalServerMessage) => void;

interface LiveTerminal {
  process: Bun.Subprocess;
  terminal: Bun.Terminal;
  buffer: string;
  subscribers: Set<Subscriber>;
}

const MAX_BUFFER = 240_000;

export class TerminalManager {
  #terminals = new Map<string, LiveTerminal>();

  async startAgent(session: Session, cwd: string): Promise<void> {
    const agent = agentCatalog[session.agentId];
    const spec = runtime.spawn(agent.executable, agent.args, cwd);
    spec.env = { ...spec.env, ...agent.env };
    await this.#spawn(session, spec, session.initialPrompt);
  }

  async startShell(session: Session, cwd = homedir()): Promise<void> {
    await this.#spawn(session, runtime.spawnShell(cwd));
  }

  async startConfiguration(session: Session, agentId: AgentId, cwd = homedir()): Promise<void> {
    const adapter = agentCatalog[agentId];
    const [command, ...args] = adapter.configCommand.split(" ");
    if (!command) throw new Error("Agent configuration command is empty");
    await this.#spawn(session, runtime.spawn(command, args, cwd));
  }

  subscribe(sessionId: string, subscriber: Subscriber): () => void {
    const live = this.#terminals.get(sessionId);
    if (!live) {
      subscriber({ type: "error", data: "会话当前未运行。请重新启动后再连接。" });
      return () => undefined;
    }
    live.subscribers.add(subscriber);
    subscriber({ type: "ready" });
    if (live.buffer) subscriber({ type: "output", data: live.buffer });
    return () => live.subscribers.delete(subscriber);
  }

  write(sessionId: string, data: string): void {
    this.#terminals.get(sessionId)?.terminal.write(data);
  }

  resize(sessionId: string, cols: number, rows: number): void {
    if (!Number.isFinite(cols) || !Number.isFinite(rows)) return;
    this.#terminals
      .get(sessionId)
      ?.terminal.resize(
        Math.max(20, Math.min(400, Math.round(cols))),
        Math.max(5, Math.min(200, Math.round(rows))),
      );
  }

  stop(sessionId: string): void {
    const live = this.#terminals.get(sessionId);
    if (!live) return;
    live.process.kill();
    if (!live.terminal.closed) live.terminal.close();
  }

  isRunning(sessionId: string): boolean {
    return this.#terminals.has(sessionId);
  }

  async #spawn(session: Session, spec: SpawnSpec, initialInput?: string): Promise<void> {
    this.stop(session.id);
    await store.mutate((state) => {
      const stored = state.sessions.find((item) => item.id === session.id);
      if (stored) {
        stored.status = "starting";
        stored.updatedAt = new Date().toISOString();
      }
    });

    try {
      const subscribers = new Set<Subscriber>();
      const decoder = new TextDecoder();
      let buffer = "";
      const processHandle = Bun.spawn([spec.file, ...spec.args], {
        cwd: spec.cwd || homedir(),
        env: { ...process.env, ...spec.env } as Record<string, string>,
        terminal: {
          name: "xterm-256color",
          cols: 110,
          rows: 30,
          data: (_terminal, bytes) => {
            const data = decoder.decode(bytes, { stream: true });
            buffer = (buffer + data).slice(-MAX_BUFFER);
            const current = this.#terminals.get(session.id);
            if (current) current.buffer = buffer;
            for (const subscriber of subscribers) subscriber({ type: "output", data });
          },
        },
      });
      if (!processHandle.terminal) {
        processHandle.kill();
        throw new Error("Bun did not attach a terminal to the Agent process");
      }
      const live: LiveTerminal = {
        process: processHandle,
        terminal: processHandle.terminal,
        buffer,
        subscribers,
      };
      this.#terminals.set(session.id, live);

      void processHandle.exited.then((exitCode) => {
        this.#terminals.delete(session.id);
        for (const subscriber of live.subscribers) subscriber({ type: "exit", code: exitCode });
        if (!live.terminal.closed) live.terminal.close();
        void store.mutate((state) => {
          const stored = state.sessions.find((item) => item.id === session.id);
          if (stored) {
            stored.status = exitCode === 0 ? "stopped" : "failed";
            stored.exitCode = exitCode;
            stored.updatedAt = new Date().toISOString();
          }
        });
      });

      await store.mutate((state) => {
        const stored = state.sessions.find((item) => item.id === session.id);
        if (stored) {
          stored.status = "running";
          stored.updatedAt = new Date().toISOString();
        }
      });

      if (initialInput?.trim()) {
        setTimeout(() => {
          if (this.#terminals.has(session.id)) live.terminal.write(`${initialInput.trim()}\r`);
        }, 900);
      }
    } catch (error) {
      await store.mutate((state) => {
        const stored = state.sessions.find((item) => item.id === session.id);
        if (stored) {
          stored.status = "failed";
          stored.updatedAt = new Date().toISOString();
        }
      });
      throw error;
    }
  }
}

export const terminals = new TerminalManager();
