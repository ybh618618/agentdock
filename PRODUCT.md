# Product

## Register

product

## Platform

web

## Users

AgentDock 面向在 Linux 或 Windows 工作站上独立开发的个人开发者。他们需要在多个代码项目之间快速切换，并希望在一个界面中配置、启动和持续使用 Codex、Claude Code、Antigravity CLI、OpenCode 等命令行 Agent，而不必分别维护宿主机环境。

## Product Purpose

AgentDock 是一个本地优先的统一 Agent 运行时和响应式 Dashboard。它把每个项目、会话、Agent、Skills 与 AGENTS.md 配置聚合到同一工作台，并将实际执行隔离在由 Podman/Distrobox 或 Windows WSL 承载的 Ubuntu 26.04 环境中。成功意味着用户完成一次引导后，可以从项目或首页提示词开始，在数秒内进入一个拥有完整权限、可恢复历史且环境一致的 Agent 终端。

## Brand Personality

克制、精确、可靠。界面应像成熟的本地开发工具：安静地承载高密度工作流，清楚展示当前项目、Agent、容器与会话状态，不以装饰抢夺注意力。

## Anti-references

不采用紫色或霓虹渐变的“AI 产品”视觉，不使用装饰性玻璃拟态、过度圆角、层层嵌套卡片、伪终端装饰或无意义动效。不把常规设置与项目管理隐藏在新奇但难以发现的交互中。

## Design Principles

- 环境状态始终可见：用户随时知道当前项目、Agent、容器和更新状态。
- 快路径优先：新建项目、新建对话、恢复会话都应在最少步骤内完成。
- 熟悉胜过炫技：使用开发者已经理解的侧边栏、终端、设置和快捷键模型。
- 本地优先且可恢复：数据、项目与会话默认保存在本机，重启应用后能无缝继续。
- 危险能力必须诚实：YOLO/完全权限模式明确标识其作用域，不制造虚假的安全感。

## Accessibility & Inclusion

以 WCAG 2.2 AA 为最低标准，完整支持键盘操作、清晰焦点状态、屏幕阅读器标签、缩放与窄屏布局，并尊重减少动态效果偏好。亮暗主题均保持正文与控件对比度；颜色不作为状态的唯一表达。界面文案与布局为后续中英双语预留扩展能力。
