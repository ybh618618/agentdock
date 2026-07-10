---
name: environment-manager
description: Manage development tools and system packages inside the AgentDock Ubuntu environment. Use whenever an Agent needs to inspect, install, remove, repair, or update operating-system packages or developer toolchains.
metadata:
  platforms: [linux]
  runtime: agentdock
---

# AgentDock environment management

You are running inside AgentDock's Ubuntu 26.04 environment. Keep environment changes reproducible and confined to this runtime.

## Package policy

- Use `apt` for operating-system packages and development-environment dependencies whenever an Ubuntu package exists.
- Call `apt` directly. Never prefix it with `sudo`; AgentDock's `apt` wrapper performs the narrowly scoped privilege elevation.
- Do not add `-y` or `--assume-yes`; the runtime already enables automatic confirmation globally.
- Before guessing a package name, use `apt search <term>` or `apt-cache show <package>`.
- Install the smallest explicit package set. Do not install recommendations solely for convenience.
- Use language package managers only for project dependencies or tools that are not distributed by Ubuntu. Do not use them to replace an available system library.

## Standard workflow

1. Inspect first: `command -v <tool>` and `apt-cache policy <package>`.
2. Refresh only when package metadata is stale: `apt update`.
3. Install explicitly: `apt install <package...>`.
4. Verify the installed executable and version.
5. Record any new system dependency in the project's README or bootstrap script.

## Safety

- Never edit `/etc/apt` sources or AgentDock's sudoers policy. The Dashboard owns mirror and privilege configuration.
- Never run `apt purge`, `apt autoremove`, or distribution upgrades unless the user explicitly asks.
- Do not disable the background `agentdock-maintain` job or its `flock` guard.
- If `apt` reports a lock, wait for the background maintenance job to finish instead of deleting lock files.
