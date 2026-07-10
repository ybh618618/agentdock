# AgentDock

[![CI](https://github.com/ybh618618/agentdock/actions/workflows/ci.yml/badge.svg)](https://github.com/ybh618618/agentdock/actions/workflows/ci.yml)

AgentDock is a local-first dashboard and unified runtime for terminal coding Agents. It gives personal developers one place to manage projects, conversations, Agent configuration, Skills, `AGENTS.md`, and the Ubuntu environment that executes commands.

## What is implemented

- Responsive React dashboard with light/dark themes, first-run onboarding, project navigation, recent projects, quick switcher, session tabs, empty/error/loading states, and keyboard shortcuts.
- PTY terminal streaming over a local WebSocket, including resize, reconnect/exit feedback, project shells, and embedded Agent configuration terminals.
- Adapters for Codex, Claude Code, Antigravity CLI, and OpenCode. Interactive sessions start in each CLI's explicit auto-approval mode.
- Bun server with local JSON persistence, project/session/settings APIs, runtime status, Agent installation, project/global Skill installation, and container reset actions.
- Linux rootless Podman + Distrobox runtime using Ubuntu 26.04. The package contains no OCI image; onboarding pulls it on demand.
- Direct `apt` usage for Agents: automatic confirmation, an internal privilege wrapper, shared `flock` locking, and a non-blocking update/upgrade job on container start.
- Project `AGENTS.md` editing with a generated `CLAUDE.md` bridge file; Antigravity CLI reads `AGENTS.md` directly.
- nFPM packaging for `.deb`, `.rpm`, and `.pkg.tar.zst`, plus a Windows WSL 2.4.4+ `.wsl` build.

## Architecture

```text
Browser dashboard (React + xterm.js)
        │ HTTP / WebSocket on loopback
        ▼
Bun server (state, APIs, PTY, lifecycle)
        │
        ├── Linux: rootless Podman → Distrobox → Ubuntu 26.04
        └── Windows: AgentDock.wsl → Ubuntu 26.04
                                    │
                                    ├── Agent CLIs in auto-approval mode
                                    ├── bunx skills@1.5.15
                                    └── apt wrapper + background maintenance
```

The Linux Distrobox is an integrated development environment, not a hostile-code sandbox. It can see mounted projects and parts of the host home directory. The Dashboard therefore labels Agent sessions as auto-approved and keeps their writable scope visible.

## Development

Requirements: Bun 1.3+, Node.js only for optional design tooling, and a modern browser.

```sh
bun install

# Terminal 1: server in direct development mode
AGENTDOCK_DEV_DIRECT=1 bun run --cwd apps/server dev

# Terminal 2: Vite dashboard
bun run --cwd apps/dashboard dev
```

Open `http://127.0.0.1:5173`. Direct mode never installs or upgrades host packages; it exists only for UI/API development. Use a disposable project when testing live Agent sessions because auto-approval flags are active.

Quality checks:

```sh
bun run check
bun run lint
```

## Environment Skill

The repository includes [`skills/environment-manager/SKILL.md`](skills/environment-manager/SKILL.md). AgentDock installs it only through `bunx skills`:

```sh
bunx skills@1.5.15 add ybh618618/agentdock \
  --global --skill environment-manager \
  --agent codex claude-code antigravity-cli opencode \
  --yes --copy
```

Project Skills use the same command without `--global`, executed from the project directory.

## Distribution

Build the Dashboard and a baseline x64 standalone executable:

```sh
bun run build:binary
```

Linux package builds require a pinned nFPM installation and explicit release metadata:

```sh
export AGENTDOCK_MAINTAINER="Your Name <you@example.com>"
export AGENTDOCK_HOMEPAGE="https://github.com/your-org/agentdock"
export AGENTDOCK_LICENSE="YOUR-CHOSEN-LICENSE"

packaging/linux/build.sh 0.1.0 amd64 dist/linux-amd64/agentdock dist/packages
```

Windows `.wsl` builds require Podman and use the compiled Linux executable:

```sh
packaging/windows/build-wsl.sh 0.1.0 amd64 dist/wsl
```

See [`packaging/DISTRIBUTION.md`](packaging/DISTRIBUTION.md) for package layout, first-run behavior, WSL registration, reset semantics, and CI requirements.

## Current release boundaries

- A project license, maintainer metadata, and signing identity must be chosen before publishing packages.
- Linux packages can omit the Ubuntu image. A `.wsl` file is itself a compressed Linux root filesystem by Microsoft's format definition, so the Windows artifact necessarily includes the minimal Ubuntu 26.04 rootfs.
- The packaged app currently uses a fixed loopback port. The distribution design documents endpoint discovery and one-time browser tokens as release hardening work.
- Google authentication for Antigravity CLI is completed interactively on first launch.

## Keyboard shortcuts

- `Ctrl/Cmd + K`: open quick switcher
- `Ctrl/Cmd + N`: new conversation in the current project, or add a project from Home
- `Ctrl/Cmd + Enter`: submit the Home prompt
