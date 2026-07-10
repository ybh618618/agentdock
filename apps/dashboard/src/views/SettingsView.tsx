import type {
  AgentDefinition,
  AgentId,
  AppSettings,
  RuntimeInfo,
  Session,
  ThemePreference,
} from "@agentdock/shared";
import {
  Box,
  Check,
  ChevronRight,
  CircleAlert,
  CloudDownload,
  Cpu,
  ExternalLink,
  HardDrive,
  KeyRound,
  Languages,
  MonitorCog,
  PackagePlus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  ShieldAlert,
  Sparkles,
  Terminal,
} from "lucide-react";
import { useEffect, useState } from "react";
import { LazyTerminalView } from "../components/LazyTerminalView";
import { Button, StatusDot, Switch } from "../components/ui";
import { MobileTopbar } from "./HomeView";

type SettingsSection = "general" | "agents" | "runtime";

export function SettingsView({
  settings,
  agents,
  runtime,
  configurationSession,
  dark,
  onOpenMenu,
  onUpdate,
  onConfigureAgent,
  onInstallAgents,
  onEnsureRuntime,
  onUpdateRuntime,
  onResetRuntime,
  onRestartSession,
}: {
  settings: AppSettings;
  agents: AgentDefinition[];
  runtime: RuntimeInfo;
  configurationSession?: Session;
  dark: boolean;
  onOpenMenu: () => void;
  onUpdate: (patch: Partial<AppSettings>) => Promise<void>;
  onConfigureAgent: (agentId: AgentId) => Promise<void>;
  onInstallAgents: (agentIds: AgentId[]) => Promise<void>;
  onEnsureRuntime: () => Promise<void>;
  onUpdateRuntime: () => Promise<void>;
  onResetRuntime: () => void;
  onRestartSession: (id: string) => Promise<void>;
}) {
  const [section, setSection] = useState<SettingsSection>("general");
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => setDraft(settings), [settings]);

  async function save(patch: Partial<AppSettings> = draft) {
    setSaving(true);
    try {
      await onUpdate(patch);
    } finally {
      setSaving(false);
    }
  }

  function toggleAgent(id: AgentId, enabled: boolean) {
    const next = enabled
      ? [...new Set([...draft.enabledAgents, id])]
      : draft.enabledAgents.filter((agentId) => agentId !== id);
    setDraft((current) => ({ ...current, enabledAgents: next }));
  }

  return (
    <main className="page settings-page">
      <MobileTopbar title="设置" onOpenMenu={onOpenMenu} />
      <header className="settings-header">
        <div>
          <h1>设置</h1>
          <p>管理 Agent、Skills 与 Ubuntu 运行环境。</p>
        </div>
      </header>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="设置分类">
          <SettingsNavItem
            icon={<Settings size={17} />}
            label="通用"
            active={section === "general"}
            onClick={() => setSection("general")}
          />
          <SettingsNavItem
            icon={<Cpu size={17} />}
            label="Agents"
            active={section === "agents"}
            onClick={() => setSection("agents")}
          />
          <SettingsNavItem
            icon={<Box size={17} />}
            label="运行环境"
            active={section === "runtime"}
            onClick={() => setSection("runtime")}
          />
        </nav>

        <div className="settings-content">
          {section === "general" ? (
            <GeneralSettings
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              onSave={() => save()}
            />
          ) : null}
          {section === "agents" ? (
            <AgentSettings
              agents={agents}
              enabledAgents={draft.enabledAgents}
              skillSource={draft.skillSource}
              configurationSession={configurationSession}
              dark={dark}
              installing={installing}
              saving={saving}
              onToggle={toggleAgent}
              onSkillSource={(skillSource) => setDraft((current) => ({ ...current, skillSource }))}
              onSave={() =>
                save({ enabledAgents: draft.enabledAgents, skillSource: draft.skillSource })
              }
              onInstall={async () => {
                setInstalling(true);
                try {
                  await onInstallAgents(draft.enabledAgents);
                } finally {
                  setInstalling(false);
                }
              }}
              onConfigure={onConfigureAgent}
              onRestartSession={onRestartSession}
            />
          ) : null}
          {section === "runtime" ? (
            <RuntimeSettings
              runtime={runtime}
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              onSave={() =>
                save({ aptMirror: draft.aptMirror, autoUpdatePackages: draft.autoUpdatePackages })
              }
              onEnsure={onEnsureRuntime}
              onUpdate={onUpdateRuntime}
              onReset={onResetRuntime}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}

function SettingsNavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? "is-active" : ""}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      <span>{label}</span>
      <ChevronRight size={14} />
    </button>
  );
}

function GeneralSettings({
  draft,
  setDraft,
  saving,
  onSave,
}: {
  draft: AppSettings;
  setDraft: React.Dispatch<React.SetStateAction<AppSettings>>;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <section className="settings-section">
      <div className="settings-section__heading">
        <div>
          <h2>通用</h2>
          <p>选择界面外观与本地显示偏好。</p>
        </div>
      </div>
      <div className="setting-group">
        <div className="setting-row setting-row--stacked">
          <div className="setting-row__icon">
            <MonitorCog size={18} />
          </div>
          <div className="setting-row__content">
            <strong>外观</strong>
            <span>跟随系统，或固定使用亮色/暗色主题。</span>
            <fieldset className="segmented-control" aria-label="主题">
              {(["system", "light", "dark"] as ThemePreference[]).map((theme) => (
                <button
                  type="button"
                  key={theme}
                  aria-pressed={draft.theme === theme}
                  className={draft.theme === theme ? "is-active" : ""}
                  onClick={() => setDraft((current) => ({ ...current, theme }))}
                >
                  {theme === "system" ? "跟随系统" : theme === "light" ? "亮色" : "暗色"}
                </button>
              ))}
            </fieldset>
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-row__icon">
            <Languages size={18} />
          </div>
          <div className="setting-row__content">
            <strong>界面语言</strong>
            <span>更多语言将在后续版本开放。</span>
          </div>
          <select
            value={draft.locale}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                locale: event.target.value as AppSettings["locale"],
              }))
            }
          >
            <option value="zh-CN">简体中文</option>
            <option value="en-US">English</option>
          </select>
        </div>
      </div>
      <div className="settings-section__footer">
        <Button loading={saving} onClick={onSave}>
          <Save size={15} /> 保存更改
        </Button>
      </div>
    </section>
  );
}

function AgentSettings({
  agents,
  enabledAgents,
  skillSource,
  configurationSession,
  dark,
  installing,
  saving,
  onToggle,
  onSkillSource,
  onSave,
  onInstall,
  onConfigure,
  onRestartSession,
}: {
  agents: AgentDefinition[];
  enabledAgents: AgentId[];
  skillSource: string;
  configurationSession?: Session;
  dark: boolean;
  installing: boolean;
  saving: boolean;
  onToggle: (id: AgentId, checked: boolean) => void;
  onSkillSource: (value: string) => void;
  onSave: () => void;
  onInstall: () => Promise<void>;
  onConfigure: (id: AgentId) => Promise<void>;
  onRestartSession: (id: string) => Promise<void>;
}) {
  const configuredAgent = configurationSession
    ? agents.find((agent) => agent.id === configurationSession.agentId)
    : undefined;
  return (
    <section className="settings-section">
      <div className="settings-section__heading">
        <div>
          <h2>Agents</h2>
          <p>启用需要的 Agent，并在同一个终端中完成登录或 API 配置。</p>
        </div>
        <Button variant="secondary" loading={installing} onClick={() => void onInstall()}>
          <CloudDownload size={15} /> 安装已选
        </Button>
      </div>
      <div className="permission-banner">
        <ShieldAlert size={18} />
        <div>
          <strong>自动批准（容器环境）</strong>
          <span>
            所有会话都会绕过 Agent 自身的操作审批。Distrobox
            不是安全沙箱，项目与可见宿主目录仍可能被修改。
          </span>
        </div>
      </div>
      <div className="agent-settings-list">
        {agents.map((agent) => {
          const enabled = enabledAgents.includes(agent.id);
          return (
            <div className={`agent-setting ${enabled ? "is-enabled" : ""}`} key={agent.id}>
              <label className="agent-setting__toggle">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => onToggle(agent.id, event.target.checked)}
                />
                <span className="agent-setting__mark">
                  {enabled ? <Check size={15} /> : agent.name.slice(0, 1)}
                </span>
                <span className="agent-setting__copy">
                  <strong>{agent.name}</strong>
                  <span>{agent.description}</span>
                  {agent.availabilityNote ? (
                    <em>
                      <CircleAlert size={13} /> {agent.availabilityNote}
                    </em>
                  ) : null}
                </span>
              </label>
              <div className="agent-setting__meta">
                <span>{agent.installed ? "已安装" : "等待检测"}</span>
                <Button
                  variant="ghost"
                  disabled={!enabled}
                  onClick={() => void onConfigure(agent.id)}
                >
                  <KeyRound size={14} /> 配置
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="setting-subsection">
        <div className="setting-subsection__heading">
          <Sparkles size={17} />
          <div>
            <h3>全局环境 Skill</h3>
            <p>
              将通过 <code>bunx skills</code> 安装到所有已启用 Agent 的全局目录。
            </p>
          </div>
        </div>
        <label className="inline-field">
          <span>GitHub 来源</span>
          <input
            value={skillSource}
            onChange={(event) => onSkillSource(event.target.value)}
            placeholder="github:owner/repository"
          />
        </label>
      </div>

      {configurationSession && configuredAgent ? (
        <div className="configuration-terminal">
          <div className="configuration-terminal__heading">
            <Terminal size={16} />
            <div>
              <strong>配置 {configuredAgent.name}</strong>
              <span>认证信息只保存在运行环境内。</span>
            </div>
          </div>
          <LazyTerminalView
            session={configurationSession}
            agentName={`${configuredAgent.name} 配置`}
            dark={dark}
            compact
            onRestart={() => onRestartSession(configurationSession.id)}
          />
        </div>
      ) : null}

      <div className="settings-section__footer">
        <Button loading={saving} onClick={onSave}>
          <Save size={15} /> 保存 Agent 设置
        </Button>
      </div>
    </section>
  );
}

function RuntimeSettings({
  runtime,
  draft,
  setDraft,
  saving,
  onSave,
  onEnsure,
  onUpdate,
  onReset,
}: {
  runtime: RuntimeInfo;
  draft: AppSettings;
  setDraft: React.Dispatch<React.SetStateAction<AppSettings>>;
  saving: boolean;
  onSave: () => void;
  onEnsure: () => Promise<void>;
  onUpdate: () => Promise<void>;
  onReset: () => void;
}) {
  const ready = runtime.status === "ready";
  const busy = ["pulling", "provisioning", "updating"].includes(runtime.status);
  return (
    <section className="settings-section">
      <div className="settings-section__heading">
        <div>
          <h2>运行环境</h2>
          <p>管理 Ubuntu 26.04、apt 镜像与后台维护。</p>
        </div>
      </div>
      <div className="runtime-hero">
        <div className="runtime-hero__icon">
          <Box size={22} />
        </div>
        <div className="runtime-hero__copy">
          <strong>{runtime.distribution}</strong>
          <span>
            {runtime.containerName} ·{" "}
            {runtime.platform === "windows-wsl"
              ? "WSL 2"
              : runtime.platform === "direct"
                ? "开发直连"
                : "Podman / Distrobox"}
          </span>
        </div>
        <div className="runtime-hero__state">
          <StatusDot
            status={
              ready ? "ready" : runtime.status === "error" ? "error" : busy ? "busy" : "offline"
            }
          />{" "}
          {ready ? "已就绪" : runtime.message}
        </div>
      </div>

      {runtime.status === "missing" || runtime.status === "error" ? (
        <div className="runtime-callout">
          <CircleAlert size={18} />
          <div>
            <strong>{runtime.status === "error" ? "环境需要处理" : "尚未初始化"}</strong>
            <span>{runtime.message}</span>
          </div>
          <Button onClick={() => void onEnsure()}>
            <PackagePlus size={15} /> 初始化环境
          </Button>
        </div>
      ) : null}

      <div className="setting-group">
        <label className="setting-row setting-row--stacked">
          <div className="setting-row__icon">
            <HardDrive size={18} />
          </div>
          <div className="setting-row__content">
            <strong>apt 镜像</strong>
            <span>修改后需重建环境才会完整应用。保留签名验证，不允许不受信任的软件源。</span>
            <input
              value={draft.aptMirror}
              onChange={(event) =>
                setDraft((current) => ({ ...current, aptMirror: event.target.value }))
              }
            />
          </div>
        </label>
        <Switch
          checked={draft.autoUpdatePackages}
          onChange={(autoUpdatePackages) =>
            setDraft((current) => ({ ...current, autoUpdatePackages }))
          }
          label="启动时后台更新软件包"
          description="更新使用文件锁串行执行，不会阻塞 Agent 终端启动。"
        />
      </div>

      <div className="runtime-actions">
        <Button variant="secondary" disabled={!ready || busy} onClick={() => void onUpdate()}>
          <RefreshCw size={15} /> 立即更新
        </Button>
        <Button variant="secondary" loading={saving} onClick={onSave}>
          <Save size={15} /> 保存镜像设置
        </Button>
      </div>

      <div className="danger-zone">
        <div>
          <h3>重置运行环境</h3>
          <p>
            移除容器 rootfs 后重新拉取。项目文件默认保留，Agent 配置与凭据不会在未经确认时删除。
          </p>
        </div>
        <Button variant="danger" onClick={onReset}>
          <RotateCcw size={15} /> 重置环境
        </Button>
      </div>
      <p className="runtime-note">
        <ExternalLink size={13} /> Distrobox 提供开发环境集成，不应被视为安全隔离边界。
      </p>
    </section>
  );
}
