import type { AppState, Project, RuntimeStatus } from "@agentdock/shared";
import { Bot, ChevronLeft, Home, Moon, Plus, Settings, SlidersHorizontal, Sun } from "lucide-react";
import { IconButton, StatusDot } from "./ui";

export type View = { type: "home" } | { type: "settings" } | { type: "project"; projectId: string };

export function Sidebar({
  state,
  view,
  mobileOpen,
  onNavigate,
  onAddProject,
  onNewSession,
  onProjectSettings,
  onToggleTheme,
  onCloseMobile,
}: {
  state: AppState;
  view: View;
  mobileOpen: boolean;
  onNavigate: (view: View) => void;
  onAddProject: () => void;
  onNewSession: (project: Project) => void;
  onProjectSettings: (project: Project) => void;
  onToggleTheme: () => void;
  onCloseMobile: () => void;
}) {
  const themeIcon = state.settings.theme === "dark" ? <Sun size={17} /> : <Moon size={17} />;
  return (
    <>
      <div
        className={`sidebar-backdrop ${mobileOpen ? "is-visible" : ""}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />
      <aside className={`sidebar ${mobileOpen ? "is-open" : ""}`} aria-label="主导航">
        <header className="sidebar__brand">
          <button type="button" className="brand" onClick={() => onNavigate({ type: "home" })}>
            <span className="brand__mark">
              <Bot size={17} aria-hidden="true" />
            </span>
            <span>AgentDock</span>
          </button>
          <IconButton label="收起导航" className="sidebar__close" onClick={onCloseMobile}>
            <ChevronLeft size={19} />
          </IconButton>
        </header>

        <nav className="sidebar__nav">
          <button
            type="button"
            className={`nav-item ${view.type === "home" ? "is-active" : ""}`}
            onClick={() => onNavigate({ type: "home" })}
            aria-current={view.type === "home" ? "page" : undefined}
          >
            <Home size={17} aria-hidden="true" />
            <span>首页</span>
            <kbd>G H</kbd>
          </button>
        </nav>

        <section className="sidebar__projects" aria-labelledby="projects-label">
          <div className="sidebar__section-heading">
            <span id="projects-label">项目</span>
            <IconButton label="添加项目" onClick={onAddProject}>
              <Plus size={16} aria-hidden="true" />
            </IconButton>
          </div>
          <div className="project-nav-list">
            {state.projects.length === 0 ? (
              <button type="button" className="project-nav-empty" onClick={onAddProject}>
                <Plus size={15} /> 添加第一个项目
              </button>
            ) : (
              state.projects.map((project) => (
                <div
                  className={`project-nav ${view.type === "project" && view.projectId === project.id ? "is-active" : ""}`}
                  key={project.id}
                >
                  <button
                    type="button"
                    className="project-nav__main"
                    onClick={() => onNavigate({ type: "project", projectId: project.id })}
                    aria-current={
                      view.type === "project" && view.projectId === project.id ? "page" : undefined
                    }
                  >
                    <span className="project-nav__glyph">
                      {project.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="project-nav__name">{project.name}</span>
                  </button>
                  <div className="project-nav__actions">
                    <IconButton
                      label={`在 ${project.name} 新建对话`}
                      onClick={() => onNewSession(project)}
                    >
                      <Plus size={14} />
                    </IconButton>
                    <IconButton
                      label={`设置 ${project.name}`}
                      onClick={() => onProjectSettings(project)}
                    >
                      <SlidersHorizontal size={14} />
                    </IconButton>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <footer className="sidebar__footer">
          <RuntimeSummary
            status={state.runtime.status}
            label={state.runtime.message || state.runtime.distribution}
          />
          <div className="sidebar__footer-actions">
            <button
              type="button"
              className={`nav-item ${view.type === "settings" ? "is-active" : ""}`}
              onClick={() => onNavigate({ type: "settings" })}
              aria-current={view.type === "settings" ? "page" : undefined}
            >
              <Settings size={17} />
              <span>设置</span>
            </button>
            <IconButton label="切换亮暗主题" onClick={onToggleTheme}>
              {themeIcon}
            </IconButton>
          </div>
        </footer>
      </aside>
    </>
  );
}

function RuntimeSummary({ status, label }: { status: RuntimeStatus; label: string }) {
  const mapped =
    status === "ready"
      ? "ready"
      : status === "error"
        ? "error"
        : status === "missing"
          ? "offline"
          : "busy";
  return (
    <div className="runtime-summary" title={label}>
      <StatusDot status={mapped} />
      <span className="runtime-summary__label">{label}</span>
      {status === "updating" || status === "pulling" || status === "provisioning" ? (
        <span className="runtime-summary__pulse" />
      ) : null}
    </div>
  );
}
