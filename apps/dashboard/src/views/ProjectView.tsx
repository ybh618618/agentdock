import type { AgentDefinition, Project, Session } from "@agentdock/shared";
import {
  AlertTriangle,
  MessageSquarePlus,
  Plus,
  Settings2,
  ShieldCheck,
  Terminal,
  X,
} from "lucide-react";
import { LazyTerminalView } from "../components/LazyTerminalView";
import { Button, IconButton, StatusDot } from "../components/ui";
import { MobileTopbar } from "./HomeView";

export function ProjectView({
  project,
  sessions,
  agents,
  selectedSessionId,
  dark,
  onOpenMenu,
  onSelectSession,
  onNewConversation,
  onNewShell,
  onOpenSettings,
  onDeleteSession,
  onRestartSession,
}: {
  project: Project;
  sessions: Session[];
  agents: AgentDefinition[];
  selectedSessionId?: string;
  dark: boolean;
  onOpenMenu: () => void;
  onSelectSession: (id: string) => void;
  onNewConversation: () => void;
  onNewShell: () => void;
  onOpenSettings: () => void;
  onDeleteSession: (id: string) => Promise<void>;
  onRestartSession: (id: string) => Promise<void>;
}) {
  const sorted = [...sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const selected = sorted.find((session) => session.id === selectedSessionId) || sorted[0];
  const agent = selected ? agents.find((item) => item.id === selected.agentId) : undefined;

  return (
    <main className="page project-page">
      <MobileTopbar
        title={project.name}
        onOpenMenu={onOpenMenu}
        end={
          <IconButton label="新建对话" onClick={onNewConversation}>
            <Plus size={18} />
          </IconButton>
        }
      />
      <header className="project-header">
        <div className="project-header__identity">
          <div className="project-header__glyph">{project.name.slice(0, 1).toUpperCase()}</div>
          <div>
            <h1>{project.name}</h1>
            <p title={project.path}>{project.path}</p>
          </div>
        </div>
        <div className="project-header__actions">
          <Button variant="secondary" onClick={onNewShell}>
            <Terminal size={16} /> 项目终端
          </Button>
          <Button onClick={onNewConversation}>
            <MessageSquarePlus size={16} /> 新建对话
          </Button>
          <IconButton label="项目设置" onClick={onOpenSettings}>
            <Settings2 size={18} />
          </IconButton>
        </div>
      </header>

      {sorted.length ? (
        <>
          <div className="session-tabs" role="tablist" aria-label="项目会话">
            {sorted.map((session) => {
              const definition = agents.find((item) => item.id === session.agentId);
              return (
                <div
                  className={`session-tab ${selected?.id === session.id ? "is-active" : ""}`}
                  key={session.id}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selected?.id === session.id}
                    onClick={() => onSelectSession(session.id)}
                  >
                    <StatusDot
                      status={
                        session.status === "running"
                          ? "ready"
                          : session.status === "failed"
                            ? "error"
                            : "offline"
                      }
                    />
                    <span className="session-tab__title">{session.title}</span>
                    <span className="session-tab__agent">
                      {session.kind === "shell" ? "Shell" : definition?.name}
                    </span>
                  </button>
                  <IconButton
                    label={`关闭 ${session.title}`}
                    onClick={() => void onDeleteSession(session.id)}
                  >
                    <X size={13} />
                  </IconButton>
                </div>
              );
            })}
            <IconButton label="新建对话" className="session-tabs__add" onClick={onNewConversation}>
              <Plus size={16} />
            </IconButton>
          </div>
          <div className="project-terminal-wrap">
            {selected ? (
              <>
                <div className="permission-notice">
                  <ShieldCheck size={14} />
                  <span>
                    {selected.kind === "shell"
                      ? "项目 Shell"
                      : `${agent?.name || "Agent"} · 自动批准模式`}
                  </span>
                  <span className="permission-notice__scope">
                    作用域：Ubuntu 运行环境与已挂载项目
                  </span>
                </div>
                <LazyTerminalView
                  session={selected}
                  agentName={
                    selected.kind === "shell" ? "项目终端" : agent?.name || selected.agentId
                  }
                  dark={dark}
                  onRestart={() => onRestartSession(selected.id)}
                />
              </>
            ) : null}
          </div>
        </>
      ) : (
        <section className="project-empty">
          <div className="project-empty__symbol">
            <MessageSquarePlus size={27} />
          </div>
          <h2>这个项目还没有会话</h2>
          <p>选择一个 Agent 开始工作，或先打开项目终端检查环境。</p>
          <div className="project-empty__actions">
            <Button onClick={onNewConversation}>
              <MessageSquarePlus size={16} /> 选择 Agent
            </Button>
            <Button variant="secondary" onClick={onNewShell}>
              <Terminal size={16} /> 打开 Shell
            </Button>
          </div>
          <div className="project-empty__warning">
            <AlertTriangle size={15} /> Agent 会自动批准工具调用。请确认项目中没有不应暴露的凭据。
          </div>
        </section>
      )}
    </main>
  );
}
