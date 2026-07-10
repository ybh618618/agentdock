import type { AgentDefinition, Project, RuntimeInfo } from "@agentdock/shared";
import {
  ArrowRight,
  Clock3,
  FolderPlus,
  Menu,
  Plus,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button, IconButton, StatusDot } from "../components/ui";

export function HomeView({
  projects,
  agents,
  runtime,
  onOpenMenu,
  onSubmitPrompt,
  onAddProject,
  onOpenProject,
}: {
  projects: Project[];
  agents: AgentDefinition[];
  runtime: RuntimeInfo;
  onOpenMenu: () => void;
  onSubmitPrompt: (prompt: string) => Promise<void>;
  onAddProject: () => void;
  onOpenProject: (project: Project) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmitPrompt(prompt.trim());
      setPrompt("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page home-page">
      <MobileTopbar title="首页" onOpenMenu={onOpenMenu} />
      <div className="home-page__content">
        <section className="home-intro" aria-labelledby="home-title">
          <div className="home-intro__copy">
            <span className="home-intro__status">
              <StatusDot
                status={
                  runtime.status === "ready"
                    ? "ready"
                    : runtime.status === "error"
                      ? "error"
                      : "busy"
                }
              />
              {runtime.status === "ready" ? "运行环境已就绪" : runtime.message}
            </span>
            <h1 id="home-title">从一个想法，进入可工作的终端。</h1>
            <p>
              描述你想做的事。AgentDock 会在 <code>~/project</code> 中建立项目，再让你选择负责执行的
              Agent。
            </p>
          </div>
          <fieldset className="home-intro__agents" aria-label="已启用的 Agent">
            {agents
              .filter((agent) => agent.enabled)
              .map((agent) => (
                <span className="agent-token" key={agent.id}>
                  {agent.name}
                </span>
              ))}
          </fieldset>
        </section>

        <form className="prompt-composer" onSubmit={submit}>
          <label htmlFor="home-prompt">给 AgentDock 一个任务</label>
          <textarea
            id="home-prompt"
            rows={4}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="例如：创建一个离线优先的 Markdown 笔记应用，并为同步冲突设计测试……"
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter")
                event.currentTarget.form?.requestSubmit();
            }}
          />
          <div className="prompt-composer__footer">
            <span>
              <kbd>⌘</kbd>
              <kbd>↵</kbd> 发送
            </span>
            <Button type="submit" loading={submitting} disabled={!prompt.trim()}>
              选择 Agent <ArrowRight size={16} />
            </Button>
          </div>
        </form>

        <section className="home-workspace" aria-labelledby="workspace-title">
          <div className="section-title-row">
            <div>
              <h2 id="workspace-title">你的工作区</h2>
              <p>
                {projects.length
                  ? "继续最近的项目，或接入一个已有目录。"
                  : "先创建一个项目，之后所有会话都会在这里保留。"}
              </p>
            </div>
            <Button variant="secondary" onClick={onAddProject}>
              <FolderPlus size={16} /> 添加项目
            </Button>
          </div>

          {projects.length ? (
            <div className="recent-projects">
              {projects.slice(0, 6).map((project) => (
                <button
                  type="button"
                  key={project.id}
                  className="recent-project"
                  onClick={() => onOpenProject(project)}
                >
                  <span className="recent-project__icon">
                    {project.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="recent-project__copy">
                    <strong>{project.name}</strong>
                    <span>{project.path}</span>
                  </span>
                  <span className="recent-project__time">
                    <Clock3 size={14} /> {relativeTime(project.updatedAt)}
                  </span>
                  <ArrowRight className="recent-project__arrow" size={17} />
                </button>
              ))}
            </div>
          ) : (
            <div className="workspace-empty">
              <div className="workspace-empty__icon">
                <TerminalSquare size={23} />
              </div>
              <div>
                <h3>还没有项目</h3>
                <p>接入现有文件夹，或直接在上方描述一个新项目。</p>
              </div>
              <Button variant="secondary" onClick={onAddProject}>
                <Plus size={16} /> 添加现有项目
              </Button>
            </div>
          )}
        </section>

        <div className="home-footnotes">
          <span>
            <ShieldCheck size={15} /> Agent 在 Ubuntu 26.04 环境中自动批准操作
          </span>
          <span>
            <Sparkles size={15} /> Skills 由 bunx skills 统一管理
          </span>
        </div>
      </div>
    </main>
  );
}

export function MobileTopbar({
  title,
  onOpenMenu,
  end,
}: {
  title: string;
  onOpenMenu: () => void;
  end?: React.ReactNode;
}) {
  return (
    <header className="mobile-topbar">
      <IconButton label="打开导航" onClick={onOpenMenu}>
        <Menu size={20} />
      </IconButton>
      <strong>{title}</strong>
      <span className="mobile-topbar__end">{end}</span>
    </header>
  );
}

function relativeTime(value: string): string {
  const delta = Date.now() - new Date(value).getTime();
  if (delta < 60_000) return "刚刚";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} 分钟前`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} 小时前`;
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(
    new Date(value),
  );
}
