# AgentDock 分发与运行时方案

> 状态：可实施的基线方案，2026-07-10。下面的脚本是初始骨架，等应用入口稳定后在 CI 中接入。

## 1. 结论

Linux 使用一个 nFPM 配置生成 `deb`、`rpm` 和 `pkg.tar.zst`；包里只放 AgentDock 应用、桌面入口、systemd user unit 和 Distrobox 引导脚本，不放 Ubuntu OCI 镜像。首次打开 Dashboard 后，引导页才执行 `podman pull docker.io/library/ubuntu:26.04` 和 `distrobox assemble create`。

Windows 使用 WSL 2.4.4+ 的现代 `.wsl` 分发格式。文件可双击安装，`/etc/wsl-distribution.conf` 负责 OOBE、默认名称和 Start 菜单快捷方式。默认用户的 login shell 是一个很短的 AgentDock 启动器：它等待 WSL 内的 systemd 服务，然后用 Windows 默认浏览器打开 Dashboard 并退出，因此不会留下一个伪 GUI 窗口。

### 必须明确的 Windows 约束

Microsoft 定义的 `.wsl` 就是“含完整 Linux root filesystem 的 tar 文件”，所以“Windows 用 `.wsl` 分发”与“安装包绝对不包含 Linux 运行环境”不能同时成立。推荐将“不打包容器”限定为 Linux 三种宿主包；Windows `.wsl` 包含最小 Ubuntu 26.04 rootfs 与 AgentDock，但不再嵌套 Podman/Distrobox 镜像。如果必须严格做到首启才下载 Ubuntu，就需要改成 Windows bootstrapper（不再是单一 `.wsl`）或在一个极小 WSL rootfs 内再嵌套一个运行时，后者不值得采用。

Microsoft 的官方说明确认了 `.wsl` 的 rootfs 结构、WSL 2.4.4 最低版本、双击安装、OOBE 及快捷方式配置：[Build a Custom Linux Distribution for WSL](https://learn.microsoft.com/en-us/windows/wsl/build-custom-distro)。

## 2. 产物矩阵

| 平台 | 产物 | 架构 | 安装后运行时 |
| --- | --- | --- | --- |
| Debian / Ubuntu | `agentdock_VERSION_amd64.deb` | amd64，后续 arm64 | rootless Podman + Distrobox，首启拉 Ubuntu 26.04 |
| Fedora / RHEL 系 | `agentdock-VERSION.x86_64.rpm` | amd64，后续 arm64 | 同上；RHEL 需先启用提供 Distrobox 的仓库 |
| Arch Linux | `agentdock-VERSION-x86_64.pkg.tar.zst` | amd64，后续 arm64 | 同上 |
| Windows | `AgentDock-VERSION-amd64.wsl` | amd64，后续 arm64 | `.wsl` 本身是 Ubuntu 26.04 WSL rootfs |

Linux 的 Bun server 不依赖宿主安装 Bun。发布构建用 `bun build --compile`，这会把 Bun 运行时、server 代码和前端资源放进一个可执行文件，且官方支持 Linux x64 baseline 与 arm64 交叉目标：[Bun single-file executable](https://bun.sh/docs/bundler/executables)。

amd64 发布建议用 `bun-linux-x64-baseline`，避免旧 CPU 上的 AVX2 `Illegal instruction`。

## 3. Linux 包布局

```text
/usr/bin/agentdock                         -> /usr/lib/agentdock/agentdock
/usr/lib/agentdock/agentdock               # 自包含 Bun server/CLI
/usr/lib/agentdock/runtime/*               # 首启拉取、重置和容器 hook
/usr/lib/systemd/user/agentdock.service    # 用户级 server
/usr/share/applications/agentdock.desktop  # Linux GUI 注册
/usr/share/icons/hicolor/.../agentdock.*   # 正式发布前补齐
```

用户数据不进包，遵循 XDG：

```text
${XDG_CONFIG_HOME:-~/.config}/agentdock/        # 设置、Agent 选择、镜像源
${XDG_DATA_HOME:-~/.local/share}/agentdock/     # DB、会话元数据、runtime-home
${XDG_CACHE_HOME:-~/.cache}/agentdock/          # 可丢弃缓存
${XDG_RUNTIME_DIR}/agentdock/endpoint.json      # 当次登录的端口与一次性打开令牌
```

容器使用独立 `runtime-home`，避免 Agent 配置污染宿主 home。Distrobox 文档说明 `--home` 会替换容器 HOME，但宿主 home 仍会挂载，所以 home 下已有项目仍可按原绝对路径访问：[Distrobox create](https://distrobox.it/usage/distrobox-create/)。home 外的项目由项目配置显式加 volume，不应默认把整个宿主 `/` 暴露为可写。

### 包依赖

`packaging/linux/nfpm.yaml` 为三种包分别声明 `podman`、`distrobox`、`systemd` 和 `xdg-utils`。Distrobox 官方要求一个容器管理器，并明确支持 rootless Podman：[Distrobox installation and dependencies](https://distrobox.it/)。

对 RHEL 系统，如果默认仓库没有 Distrobox，RPM 安装应正常失败并告知启用 EPEL，不要在 `%post` 中 curl 外部脚本。

### 包安装脚本的边界

`postinstall` 只刷新 desktop database（存在时），不做以下操作：

- 不拉 OCI 镜像；
- 不以 root 为某个用户创建 Podman 存储；
- 不开启 linger；
- 不代替用户启用 user service；
- 不修改 `/etc/subuid` 或 `/etc/subgid`。

包管理器脚本没有可靠的桌面用户上下文。以上检查必须由首启引导在用户会话中执行。Podman 官方也说明 rootless 容器、用户 namespace 及 subuid/subgid 前置：[Podman rootless mode](https://docs.podman.io/en/latest/markdown/podman.1.html#rootless-mode)。

## 4. Linux 启动与 Bun server 生命周期

```text
点击 AgentDock.desktop
        |
        v
agentdock open
        |-- systemctl --user daemon-reload
        |-- systemctl --user start agentdock.service
        |-- 等待 $XDG_RUNTIME_DIR/agentdock/endpoint.json + /healthz
        |-- 用 xdg-open 打开默认浏览器
        `-- 启动器退出，server 由 systemd 持有
```

systemd user service 在登录期间存活，`Restart=on-failure`处理 server 崩溃；用户退出后跟随 user manager 停止，因此不需要 linger。systemd 对 linger 的语义是让用户 manager 在开机及退出后仍然常驻，这不是一个本地 Dashboard 的必要权限：[`loginctl enable-linger`](https://www.freedesktop.org/software/systemd/man/latest/loginctl.html)。

`agentdock open` 必须是应用可执行文件的子命令，而不是一个只 `sleep 1` 的 shell，并实现下列合同：

1. 端口冲突时在 loopback 上选取空闲端口，原子写入 `endpoint.json`。
2. 读取 endpoint 后调 `/healthz`，总等待不超过 15 秒，失败时打开一个可读的错误窗口或通知，并告知 `journalctl --user -u agentdock` 路径。
3. endpoint 记录 server 的 build version。包升级后如果运行版本不同，先 `systemctl --user restart agentdock.service`，解决无法由 root 包脚本重启所有用户服务的问题。
4. 每次打开用新的高熵 one-time token；server 只绑定 loopback，校验 `Host` / `Origin`，后续使用 `HttpOnly; SameSite=Strict` session cookie。WebSocket 升级也要校验 Origin。
5. `--route=/settings` 和 `--route=/projects/new` 只允许内置路由白名单，不接受完整外部 URL。

Desktop Entry 中的 `Type=Application`、`Exec`、`Icon` 和 `Terminal=false` 符合 freedesktop 标准：[Desktop Entry Specification](https://specifications.freedesktop.org/desktop-entry/latest-single/)。

## 5. Linux 首启拉取与容器生命周期

Dashboard 引导流程的“创建环境”按钮调用 `packaging/linux/runtime/provision.sh`。脚本输出行分隔 JSON，server 可直接转为 SSE/WebSocket 进度。

1. 检查 `podman` 与 `distrobox` 可执行文件及 rootless `podman info`。
2. 使用完整镜像名，避免 Podman short-name 在无 TTY 时询问 registry。Podman 文档明确说明 short-name 可能触发交互选择：[`podman pull`](https://docs.podman.io/en/stable/markdown/podman-pull.1.html)。
3. `podman pull --policy missing docker.io/library/ubuntu:26.04`。不在应用每次打开时强制更新 base image；base image 更新是显式的“更新/重建运行时”操作，容器内包更新则是每次启动执行。
4. 从模板生成用户专有 Distrobox manifest，将引导页选择的 APT mirror 以只读配置目录挂载进容器，然后创建 `agentdock-ubuntu`。Distrobox 官方 `assemble` 格式支持 `home`、重复 `volume`、`init_hooks`、`pull` 和 `start_now`：[Distrobox assemble](https://distrobox.it/usage/distrobox-assemble/)。
5. 首次 headless enter 使 Distrobox 完成用户整合，同时触发后台 apt hook。

不要以容器 root 直接运行 Agent PTY。在常见 Podman `keep-id` / Distrobox 用户整合下，容器 root 可能在 bind mount 上留下 subordinate UID 所有的项目文件。Agent 以 Distrobox 用户运行，Agent CLI 本身使用各自的 YOLO/无审批参数；容器用户仍拥有 Distrobox 的非交互 sudo 能力。

这不是强安全沙箱。YOLO Agent 可以改写项目及 Distrobox 挂载的其他宿主文件；rootless Podman 只保证它不会因为成为容器 root 就自动获得宿主 root。Dashboard 的每个会话顶部都应常驻显示“自动批准 · 可写项目”，首次启动某个 Agent 时仅确认一次作用域，不把 Distrobox 宣传为防恶意代码边界。

### APT 不交互合同

`container-start.sh` 作为 Distrobox `init_hooks` 在容器每次从 stopped 变为 running 时执行；Distrobox 官方将 `--init-hooks` 定义为加入容器 entrypoint/init 的启动命令：[Distrobox create init hooks](https://distrobox.it/usage/distrobox-create/)。hook 会：

- 写入 `/etc/apt/apt.conf.d/99agentdock`，设置 `Assume-Yes`、`force-confdef` 和 `force-confold`；
- 验证引导页写入的 HTTP(S) mirror，根据 `/etc/os-release` 动态生成 Ubuntu deb822 sources，不硬编码 26.04 codename；
- 把 `/usr/local/bin/apt` 安装为一个很薄的非交互包装器，用户与 skill 只写 `apt ...`，不写 `sudo`；包装器内部用 Distrobox 已配置的 `sudo -n` 获得 apt 所需权限；
- 在后台执行 `/usr/bin/apt update && /usr/bin/apt upgrade`，不阻塞终端创建；
- 把 `running` / `succeeded` / `failed` 和时间写入 `/var/lib/agentdock/apt-update.json`，日志写入 `/var/log/agentdock/apt-update.log`，Dashboard 常驻显示状态并提供手动重试。

包装器是为了同时满足“命令必须是 apt”、“无需用户输入 sudo”和“不破坏项目文件属主”。如果将“无 sudo”解释为连包装器内部也绝对不能调 sudo，则只能让所有 Agent 以容器 root 运行，会带来 bind mount 文件属主问题，不推荐。

### Bun / bunx 与 Skills

Bun 编译的单文件在 `BUN_BE_BUN=1` 时可以当完整 Bun CLI 使用，这是 Bun 1.2.16+ 的官方能力。hook 会安装 `bun` / `bunx` 包装器，重用挂载进容器的 AgentDock 可执行文件，无需 curl 另一份 Bun。这使 Dashboard 可完全按产品要求用 `bunx skills` 安装全局与项目 Skills，且发布版本一致。相关官方行为见 [Bun: Act as the Bun CLI](https://bun.sh/docs/bundler/executables#act-as-the-bun-cli)。

## 6. Linux 重置语义

设置页的“重置容器环境”必须先终止所有对话并二次确认。脚本提供两个模式：

- 默认安全重置：删容器但保留 runtime-home，重建系统包的同时保留 Agent 登录、全局 Skills 与用户配置；
- `--factory`：使用 `distrobox rm --rm-home` 同时删除容器 home，只能在 UI 明确列出将被删除的认证与 Skills 后调用。

两者都不删 AgentDock DB、用户添加的项目、项目文件、项目级 Skills 声明或 AGENTS.md。Distrobox 官方为此提供 `--force` 和 `--rm-home`：[`distrobox rm`](https://distrobox.it/usage/distrobox-rm/)。

## 7. Windows `.wsl` 布局与启动

Windows 产物使用 Ubuntu 26.04 OCI rootfs 作为构建输入，安装 systemd、AgentDock 可执行文件及少量基础包后 `podman export | gzip` 得到 `.wsl`。Microsoft 推荐 rootfs tar 根目录直接是 `/`、使用 gzip 兼容旧版 WSL，最后改为 `.wsl` 扩展名。

```text
/etc/wsl-distribution.conf        # OOBE/defaultUid/defaultName/Start shortcut
/etc/wsl.conf                     # systemd=true, default user
/usr/lib/systemd/system/agentdock.service
/usr/lib/systemd/system/agentdock-apt-update.service
/usr/lib/agentdock/agentdock
/usr/lib/agentdock/oobe
/usr/lib/agentdock/wsl-app-shell
/usr/local/bin/apt                # 直接 apt + 自动确认
/usr/local/bin/bun, bunx          # 复用内嵌 Bun runtime
```

`shortcut.enabled=true` 让 WSL 在安装时注册 Start 菜单项。快捷方式启动默认 shell，AgentDock 将 UID 1000 用户的 shell 设为 `wsl-app-shell`，它只调 `agentdock open --platform=wsl` 并退出。需要原生 shell 的高级用户仍可执行：

```powershell
wsl.exe -d AgentDock -- /bin/bash -l
```

WSL 内 server 由 system service 以 `agentdock` 用户运行，因为从 Windows 快捷方式进入时不应依赖 user manager/linger。另一个 `agentdock-apt-update.service` 在每次 WSL systemd 启动时并行执行 apt update/upgrade，只记录状态而不阻断 Dashboard。`/etc/wsl.conf` 显式开启 systemd，这是 Microsoft 支持的配置：[Use systemd to manage Linux services with WSL](https://learn.microsoft.com/en-us/windows/wsl/systemd)。

server 仍只监听 Linux loopback。Windows 官方文档说明，Windows 浏览器可以通过 `localhost` 访问 WSL 中的网络应用：[Accessing network applications with WSL](https://learn.microsoft.com/en-us/windows/wsl/networking#accessing-linux-networking-apps-from-windows-localhost)。`agentdock open --platform=wsl` 用 Windows interop 调用 `explorer.exe <url>` 或无 shell 参数拼接的 PowerShell `Start-Process`，让默认浏览器打开 URL。

### Windows 升级和重置

`.wsl` 是新安装产物，不应把再次双击当作就地升级。Windows 版需要应用内升级通道：下载签名的 AgentDock Linux 可执行文件，验证 SHA-256/签名后原子替换并重启 service；Ubuntu 包由每次 WSL 启动的 apt 后台任务维护。

Windows 的“重置运行时”不能在自己的 WSL 服务内安全地执行 `wsl --unregister`。Dashboard 只提供工具/配置重置；完整出厂重置展示会删除所有 WSL 内数据的明确命令：

```powershell
wsl.exe --terminate AgentDock
wsl.exe --unregister AgentDock
```

在该提示前先提供 `wsl --export AgentDock AgentDock-backup.tar` 备份步骤。

## 8. nFPM 与 CI

nFPM 官方支持 `deb`、`rpm` 和 `archlinux` packager，且可在同一份 YAML 里为各包格式覆盖依赖：[nFPM quick start](https://nfpm.goreleaser.com/docs/quick-start/)、[nFPM configuration](https://nfpm.goreleaser.com/docs/configuration/)。

建议的发布 job：

1. 锁定 Bun 与 nFPM 版本，不在 release job 用 `latest`。
2. 构建可执行文件：amd64 baseline、arm64。
3. 运行 unit/integration test，再用 `packaging/linux/build.sh` 产出三种 Linux 包。
4. 在 Ubuntu、Fedora、Arch 全新 VM 实装，验证 desktop file、user service、rootless Podman preflight 和首启拉取；用 `desktop-file-validate` 校验桌面入口。
5. 在与目标架构相同的 Linux runner 用 `packaging/windows/build-wsl.sh` 生成 `.wsl`。在 Windows runner 上执行 `wsl --install --from-file ...`，验证 Start 菜单、OOBE、systemd 服务、localhost 和默认浏览器。
6. 对 Linux 包做仓库签名，对 `.wsl` 发布 SHA-256 与 Sigstore/GitHub artifact attestation；输出 SBOM。

## 9. 发布前必须完成的接口

- `agentdock serve`：启动 Dashboard/API/PTy server，写 endpoint 和 health/version。
- `agentdock open [--platform=linux|wsl] [--route=...]`：启动/等待服务并打开默认浏览器。
- `agentdock runtime provision|status|reset`：最终可由 TypeScript 直接实现；当前 shell 作为明确的行为参考。
- `agentdock --version --json`：用于包升级后的 server 版本握手。
- 正式 Linux SVG/PNG 和 Windows ICO 图标。WSL 未指定 icon 时会用默认 WSL icon，可用于开发，不应用于正式发布。
- 确定项目许可证、GitHub 仓库 URL 和 maintainer 身份；`build.sh` 故意要求 `AGENTDOCK_LICENSE`、`AGENTDOCK_HOMEPAGE` 和 `AGENTDOCK_MAINTAINER`，避免在发布包里默认出一个未获授权的许可证或虚构 URL。
