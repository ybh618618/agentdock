# AgentDock runtime

AgentDock executes Agents inside Ubuntu 26.04 while the dashboard stays local to the host.

- Linux uses a rootless Podman-backed Distrobox named `agentdock-ubuntu`.
- Windows imports the `AgentDock.wsl` distribution and starts commands through `wsl.exe`.
- The OCI image/rootfs is fetched or imported at install/first-run time; Linux packages never embed an OCI image.
- `../packaging/linux/runtime/provision.sh` creates the rootless Distrobox and installs the startup hook that configures the selected apt mirror, automatic confirmation, the direct `apt` wrapper, Bun/bunx bridge, baseline developer tools, and background package maintenance.

The direct runtime (`AGENTDOCK_DEV_DIRECT=1`) is only for contributors. It never installs or updates host packages.
