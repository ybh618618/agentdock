import type { RuntimeInfo } from "@agentdock/shared";

export interface SpawnSpec {
  file: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export interface RuntimeAdapter {
  readonly kind: RuntimeInfo["platform"];
  inspect(): Promise<RuntimeInfo>;
  ensure(options: { aptMirror: string; autoUpdate: boolean }): Promise<RuntimeInfo>;
  reset(): Promise<void>;
  updatePackages(): Promise<void>;
  spawn(command: string, args: string[], cwd: string): SpawnSpec;
  spawnShell(cwd: string): SpawnSpec;
  run(
    command: string,
    args: string[],
    cwd?: string,
  ): Promise<{ exitCode: number; stdout: string; stderr: string }>;
}
