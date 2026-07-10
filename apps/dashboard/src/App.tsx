import type { AgentId, AppSettings, Project } from "@agentdock/shared";
import { AlertCircle, Command, RefreshCw, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import {
  AddProjectDialog,
  AgentPickerDialog,
  ConfirmResetDialog,
  Onboarding,
  ProjectSettingsDialog,
} from "./components/dialogs";
import { QuickSwitcher } from "./components/QuickSwitcher";
import { Sidebar, type View } from "./components/Sidebar";
import { Button } from "./components/ui";
import { useAppState } from "./hooks/use-app-state";
import { HomeView } from "./views/HomeView";
import { ProjectView } from "./views/ProjectView";
import { SettingsView } from "./views/SettingsView";

interface PendingConversation {
  projectId?: string;
  prompt?: string;
  projectName?: string;
}

export function App() {
  const { state, setState, error, loading, refresh } = useAppState();
  const [view, setView] = useState<View>(() => viewFromHash());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [agentPickerOpen, setAgentPickerOpen] = useState(false);
  const [projectSettingsId, setProjectSettingsId] = useState<string>();
  const [resetOpen, setResetOpen] = useState(false);
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [pendingConversation, setPendingConversation] = useState<PendingConversation>();
  const [selectedSessions, setSelectedSessions] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" }>();
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  const dark =
    state?.settings.theme === "dark" || (state?.settings.theme === "system" && systemDark);
  const currentProject =
    view.type === "project"
      ? state?.projects.find((project) => project.id === view.projectId)
      : undefined;
  const projectSettings = state?.projects.find((project) => project.id === projectSettingsId);
  const configSession = useMemo(
    () =>
      state?.sessions
        .filter((session) => session.projectId === "__settings__")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
    [state?.sessions],
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, [dark]);

  useEffect(() => {
    const onHashChange = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setQuickSwitcherOpen(true);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        if (currentProject) beginConversation(currentProject.id);
        else setAddProjectOpen(true);
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [currentProject]);

  useEffect(() => {
    if (
      view.type === "project" &&
      state &&
      !state.projects.some((project) => project.id === view.projectId)
    ) {
      navigate({ type: "home" });
    }
  }, [state, view]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(undefined), 4_000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function navigate(next: View) {
    setView(next);
    setMobileOpen(false);
    const hash =
      next.type === "home"
        ? "#/"
        : next.type === "settings"
          ? "#/settings"
          : `#/projects/${next.projectId}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
  }

  function notify(message: string, tone: "success" | "error" = "success") {
    setToast({ message, tone });
  }

  function beginConversation(projectId?: string, prompt?: string) {
    setPendingConversation({
      projectId,
      prompt,
      projectName: projectId ? undefined : projectNameFromPrompt(prompt || "新项目"),
    });
    setAgentPickerOpen(true);
  }

  async function selectAgent(agentId: AgentId) {
    if (!pendingConversation) return;
    let projectId = pendingConversation.projectId;
    if (!projectId) {
      const result = await api.createProject({
        name: pendingConversation.projectName || "新项目",
        initialPrompt: pendingConversation.prompt,
      });
      projectId = result.project.id;
    }
    const session = await api.createSession(projectId, {
      agentId,
      initialPrompt: pendingConversation.prompt,
      kind: "agent",
    });
    setSelectedSessions((current) => ({ ...current, [projectId]: session.id }));
    await refresh(true);
    navigate({ type: "project", projectId });
    setPendingConversation(undefined);
  }

  async function createShell(project: Project) {
    try {
      const session = await api.createSession(project.id, {
        agentId: "codex",
        kind: "shell",
        title: "项目终端",
      });
      setSelectedSessions((current) => ({ ...current, [project.id]: session.id }));
      await refresh(true);
    } catch (requestError) {
      notify(requestError instanceof Error ? requestError.message : "无法启动项目终端", "error");
    }
  }

  async function updateSettings(patch: Partial<AppSettings>) {
    try {
      const next = await api.updateSettings(patch);
      setState(next);
      notify("设置已保存");
    } catch (requestError) {
      notify(requestError instanceof Error ? requestError.message : "保存设置失败", "error");
      throw requestError;
    }
  }

  if (loading && !state) return <LoadingScreen />;
  if (!state) return <ConnectionError message={error} onRetry={() => void refresh()} />;

  const currentSessions = currentProject
    ? state.sessions.filter((session) => session.projectId === currentProject.id)
    : [];
  const pickerAgents = pendingConversation?.projectId
    ? state.agents.map((agent) => ({
        ...agent,
        enabled: Boolean(
          state.projects
            .find((project) => project.id === pendingConversation.projectId)
            ?.agentIds.includes(agent.id),
        ),
      }))
    : state.agents;

  return (
    <div className="app-shell">
      <Sidebar
        state={state}
        view={view}
        mobileOpen={mobileOpen}
        onNavigate={navigate}
        onAddProject={() => setAddProjectOpen(true)}
        onNewSession={(project) => beginConversation(project.id)}
        onProjectSettings={(project) => setProjectSettingsId(project.id)}
        onToggleTheme={() => void updateSettings({ theme: dark ? "light" : "dark" })}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="app-content">
        {view.type === "home" ? (
          <HomeView
            projects={state.projects}
            agents={state.agents}
            runtime={state.runtime}
            onOpenMenu={() => setMobileOpen(true)}
            onSubmitPrompt={async (prompt) => beginConversation(undefined, prompt)}
            onAddProject={() => setAddProjectOpen(true)}
            onOpenProject={(project) => navigate({ type: "project", projectId: project.id })}
          />
        ) : null}
        {view.type === "project" && currentProject ? (
          <ProjectView
            project={currentProject}
            sessions={currentSessions}
            agents={state.agents}
            selectedSessionId={selectedSessions[currentProject.id]}
            dark={Boolean(dark)}
            onOpenMenu={() => setMobileOpen(true)}
            onSelectSession={(id) =>
              setSelectedSessions((current) => ({ ...current, [currentProject.id]: id }))
            }
            onNewConversation={() => beginConversation(currentProject.id)}
            onNewShell={() => void createShell(currentProject)}
            onOpenSettings={() => setProjectSettingsId(currentProject.id)}
            onDeleteSession={async (id) => {
              await api.deleteSession(id);
              await refresh(true);
            }}
            onRestartSession={async (id) => {
              await api.restartSession(id);
              await refresh(true);
            }}
          />
        ) : null}
        {view.type === "settings" ? (
          <SettingsView
            settings={state.settings}
            agents={state.agents}
            runtime={state.runtime}
            configurationSession={configSession}
            dark={Boolean(dark)}
            onOpenMenu={() => setMobileOpen(true)}
            onUpdate={updateSettings}
            onConfigureAgent={async (agentId) => {
              await api.configureAgent(agentId);
              await refresh(true);
            }}
            onInstallAgents={async (agentIds) => {
              await api.installAgents(agentIds);
              notify("Agent 安装任务已启动");
            }}
            onEnsureRuntime={async () => {
              await api.ensureRuntime();
              notify("运行环境初始化已在后台开始");
              await refresh(true);
            }}
            onUpdateRuntime={async () => {
              await api.updateRuntime();
              notify("apt 更新已在后台开始");
              await refresh(true);
            }}
            onResetRuntime={() => setResetOpen(true)}
            onRestartSession={async (id) => {
              await api.restartSession(id);
              await refresh(true);
            }}
          />
        ) : null}
      </div>

      {!state.settings.onboardingComplete ? (
        <Onboarding
          agents={state.agents}
          onComplete={async (settings) => {
            const next = await api.onboarding(settings);
            setState(next);
          }}
        />
      ) : null}

      <AddProjectDialog
        open={addProjectOpen}
        onClose={() => setAddProjectOpen(false)}
        onSubmit={async (input) => {
          const result = await api.createProject(input);
          await refresh(true);
          navigate({ type: "project", projectId: result.project.id });
        }}
      />
      <AgentPickerDialog
        open={agentPickerOpen}
        agents={pickerAgents}
        projectName={
          pendingConversation?.projectId
            ? state.projects.find((project) => project.id === pendingConversation.projectId)?.name
            : pendingConversation?.projectName
        }
        onClose={() => {
          setAgentPickerOpen(false);
          setPendingConversation(undefined);
        }}
        onSelect={selectAgent}
      />
      <ProjectSettingsDialog
        open={Boolean(projectSettings)}
        project={projectSettings}
        agents={state.agents}
        onClose={() => setProjectSettingsId(undefined)}
        onSave={async (patch) => {
          if (!projectSettings) return;
          await api.updateProject(projectSettings.id, patch);
          await refresh(true);
          notify("项目设置已保存");
        }}
        onInstallSkill={async (source, agents) => {
          if (!projectSettings) return;
          await api.installSkill({ source, projectId: projectSettings.id, agents });
          await refresh(true);
          notify("项目 Skill 已安装");
        }}
        onDelete={async () => {
          if (!projectSettings) return;
          await api.deleteProject(projectSettings.id);
          setProjectSettingsId(undefined);
          await refresh(true);
          navigate({ type: "home" });
          notify("项目已从 AgentDock 移除");
        }}
      />
      <ConfirmResetDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={async () => {
          await api.resetRuntime();
          notify("运行环境重置已开始");
          await refresh(true);
        }}
      />
      <QuickSwitcher
        open={quickSwitcherOpen}
        projects={state.projects}
        currentProject={currentProject}
        onClose={() => setQuickSwitcherOpen(false)}
        onNavigate={navigate}
        onAddProject={() => setAddProjectOpen(true)}
        onNewConversation={() =>
          currentProject ? beginConversation(currentProject.id) : setAddProjectOpen(true)
        }
      />

      <button
        type="button"
        className="command-trigger"
        onClick={() => setQuickSwitcherOpen(true)}
        aria-label="打开快速切换"
      >
        <Command size={14} />
        <span>快速切换</span>
        <kbd>⌘ K</kbd>
      </button>
      {toast ? (
        <div className={`toast toast--${toast.tone}`} role="status">
          <span>
            {toast.tone === "error" ? (
              <AlertCircle size={16} />
            ) : (
              <span className="toast__check">✓</span>
            )}
          </span>
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}

function viewFromHash(): View {
  const project = window.location.hash.match(/^#\/projects\/(.+)$/);
  if (project?.[1]) return { type: "project", projectId: decodeURIComponent(project[1]) };
  if (window.location.hash === "#/settings") return { type: "settings" };
  return { type: "home" };
}

function projectNameFromPrompt(prompt: string): string {
  const cleaned = prompt
    .trim()
    .replace(/[\r\n]+/g, " ")
    .replace(/[。！？，,.!?].*$/, "");
  return (
    cleaned.slice(0, 24) ||
    `新项目 ${new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(new Date())}`
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="brand">
        <span className="brand__mark">
          <RefreshCw size={17} />
        </span>
        <span>AgentDock</span>
      </div>
      <span className="loading-screen__bar" />
    </div>
  );
}

function ConnectionError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <main className="connection-error">
      <div className="connection-error__icon">
        <WifiOff size={25} />
      </div>
      <h1>无法连接 AgentDock 服务</h1>
      <p>{message || "请确认本地服务正在运行，然后重试。"}</p>
      <Button onClick={onRetry}>
        <RefreshCw size={16} /> 重新连接
      </Button>
    </main>
  );
}
