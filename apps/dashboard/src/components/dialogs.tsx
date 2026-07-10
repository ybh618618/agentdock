import type { AgentDefinition, AgentId, AppSettings, Project } from "@agentdock/shared";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Box,
  Check,
  FileCode2,
  Folder,
  Globe2,
  PackagePlus,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Button, Field, Modal, Switch } from "./ui";

const mirrorOptions = [
  { name: "Ubuntu 官方", value: "http://archive.ubuntu.com/ubuntu", description: "全球默认源" },
  {
    name: "清华大学",
    value: "https://mirrors.tuna.tsinghua.edu.cn/ubuntu",
    description: "中国大陆推荐",
  },
  { name: "阿里云", value: "https://mirrors.aliyun.com/ubuntu", description: "中国大陆镜像" },
];

export function Onboarding({
  agents,
  onComplete,
}: {
  agents: AgentDefinition[];
  onComplete: (settings: Partial<AppSettings>) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<AgentId[]>(["codex", "claude"]);
  const [mirror, setMirror] = useState(mirrorOptions[1]?.value || mirrorOptions[0]?.value || "");
  const [customMirror, setCustomMirror] = useState("");
  const [custom, setCustom] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  function toggleAgent(id: AgentId) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function finish() {
    if (!acknowledged) return;
    const aptMirror = custom ? customMirror.trim() : mirror;
    if (!aptMirror) {
      setError("请填写 apt 镜像地址");
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      await onComplete({ enabledAgents: selected, aptMirror, onboardingComplete: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "初始化失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="onboarding__topbar">
        <div className="brand">
          <span className="brand__mark">
            <Bot size={17} />
          </span>
          <span>AgentDock</span>
        </div>
        <span>初始设置 · {step + 1} / 4</span>
      </div>
      <div className="onboarding__progress" aria-hidden="true">
        <span style={{ width: `${((step + 1) / 4) * 100}%` }} />
      </div>
      <div className="onboarding__content">
        {step === 0 ? (
          <section className="onboarding__welcome">
            <div className="onboarding__symbol">
              <Bot size={30} />
            </div>
            <h1 id="onboarding-title">一个工作台，运行你选择的 Agent。</h1>
            <p>
              AgentDock 将项目、Skills、配置终端和对话会话集中在本机，并在 Ubuntu 26.04
              环境中运行命令。
            </p>
            <div className="onboarding__facts">
              <span>
                <Box size={17} />
                <strong>一致的环境</strong>
                <small>Linux 使用 Podman / Distrobox，Windows 使用 WSL 2</small>
              </span>
              <span>
                <Sparkles size={17} />
                <strong>统一 Skills</strong>
                <small>全局与项目 Skills 均由 bunx skills 管理</small>
              </span>
              <span>
                <FileCode2 size={17} />
                <strong>项目上下文</strong>
                <small>在 Dashboard 中维护 Skills 与 AGENTS.md</small>
              </span>
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="onboarding__step">
            <div className="onboarding__heading">
              <h1 id="onboarding-title">选择要安装的 Agent</h1>
              <p>之后可以随时在设置中增减。首版建议至少选择一个。</p>
            </div>
            <div className="onboarding-agents">
              {agents.map((agent) => {
                const checked = selected.includes(agent.id);
                return (
                  <button
                    type="button"
                    className={checked ? "is-selected" : ""}
                    key={agent.id}
                    onClick={() => toggleAgent(agent.id)}
                    aria-pressed={checked}
                  >
                    <span className="onboarding-agent__mark">
                      {checked ? <Check size={17} /> : agent.name.slice(0, 1)}
                    </span>
                    <span>
                      <strong>{agent.name}</strong>
                      <small>{agent.description}</small>
                      {agent.availabilityNote ? <em>{agent.availabilityNote}</em> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            {!selected.length ? <p className="form-error">至少选择一个 Agent。</p> : null}
          </section>
        ) : null}

        {step === 2 ? (
          <section className="onboarding__step">
            <div className="onboarding__heading">
              <h1 id="onboarding-title">选择 Ubuntu apt 镜像</h1>
              <p>用于容器内的软件包安装和启动时后台更新。签名校验始终开启。</p>
            </div>
            <div className="mirror-options" role="radiogroup" aria-label="apt 镜像">
              {mirrorOptions.map((option) => (
                <label
                  className={!custom && mirror === option.value ? "is-selected" : ""}
                  key={option.value}
                >
                  <input
                    type="radio"
                    name="mirror"
                    checked={!custom && mirror === option.value}
                    onChange={() => {
                      setCustom(false);
                      setMirror(option.value);
                    }}
                  />
                  <Globe2 size={18} />
                  <span>
                    <strong>{option.name}</strong>
                    <small>{option.description}</small>
                  </span>
                  <code>{option.value}</code>
                </label>
              ))}
              <label className={custom ? "is-selected" : ""}>
                <input
                  type="radio"
                  name="mirror"
                  checked={custom}
                  onChange={() => setCustom(true)}
                />
                <Globe2 size={18} />
                <span>
                  <strong>自定义镜像</strong>
                  <small>填写兼容 Ubuntu 26.04 的 archive 地址</small>
                </span>
              </label>
            </div>
            {custom ? (
              <input
                className="onboarding__custom-input"
                value={customMirror}
                onChange={(event) => setCustomMirror(event.target.value)}
                placeholder="https://mirror.example.com/ubuntu"
              />
            ) : null}
          </section>
        ) : null}

        {step === 3 ? (
          <section className="onboarding__step onboarding__review">
            <div className="onboarding__heading">
              <h1 id="onboarding-title">准备创建运行环境</h1>
              <p>首次拉取需要几分钟，Dashboard 会保持可用并展示实时状态。</p>
            </div>
            <dl className="review-list">
              <div>
                <dt>运行环境</dt>
                <dd>
                  Ubuntu 26.04 ·{" "}
                  {navigator.userAgent.includes("Windows") ? "WSL 2" : "Podman / Distrobox"}
                </dd>
              </div>
              <div>
                <dt>Agents</dt>
                <dd>
                  {selected.map((id) => agents.find((agent) => agent.id === id)?.name).join("、")}
                </dd>
              </div>
              <div>
                <dt>apt 镜像</dt>
                <dd>{custom ? customMirror : mirror}</dd>
              </div>
              <div>
                <dt>启动维护</dt>
                <dd>后台 apt update + 安全升级，带并发锁</dd>
              </div>
            </dl>
            <label className="acknowledgement">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
              <span>
                <ShieldAlert size={18} />
                <span>
                  <strong>我了解 Agent 会自动批准操作</strong>
                  <small>
                    Distrobox 用于环境集成而非安全沙箱。完全权限 Agent
                    可以修改项目以及运行时可见的宿主目录。
                  </small>
                </span>
              </span>
            </label>
            {error ? <p className="form-error">{error}</p> : null}
          </section>
        ) : null}
      </div>
      <footer className="onboarding__footer">
        <Button
          variant="ghost"
          disabled={step === 0 || submitting}
          onClick={() => setStep((current) => current - 1)}
        >
          <ArrowLeft size={16} /> 上一步
        </Button>
        {step < 3 ? (
          <Button
            disabled={step === 1 && selected.length === 0}
            onClick={() => setStep((current) => current + 1)}
          >
            继续 <ArrowRight size={16} />
          </Button>
        ) : (
          <Button loading={submitting} disabled={!acknowledged} onClick={() => void finish()}>
            <PackagePlus size={16} /> 创建环境
          </Button>
        )}
      </footer>
    </div>
  );
}

export function AddProjectDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: { name: string; path?: string }) => Promise<void>;
}) {
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setPath("");
      setName("");
      setNameTouched(false);
      setError(undefined);
    }
  }, [open]);

  function updatePath(value: string) {
    setPath(value);
    if (!nameTouched) {
      const folder =
        value
          .replace(/[\\/]+$/, "")
          .split(/[\\/]/)
          .pop() || "";
      setName(folder);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("请输入项目名称");
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      await onSubmit({ name: name.trim(), path: path.trim() || undefined });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "添加项目失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="添加项目"
      description="接入已有目录；不填写路径时会在 ~/project 下创建。"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form="add-project-form" loading={loading}>
            添加项目
          </Button>
        </>
      }
    >
      <form id="add-project-form" className="dialog-form" onSubmit={submit}>
        <Field label="项目目录" hint="Linux 使用宿主绝对路径；Windows 建议使用 WSL home 下的目录。">
          <div className="input-with-icon">
            <Folder size={16} />
            <input
              value={path}
              onChange={(event) => updatePath(event.target.value)}
              placeholder="/home/you/code/my-project"
            />
          </div>
        </Field>
        <Field label="显示名称" hint="默认取项目文件夹名称。" error={error}>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameTouched(true);
            }}
            placeholder="my-project"
          />
        </Field>
      </form>
    </Modal>
  );
}

export function AgentPickerDialog({
  open,
  agents,
  projectName,
  onClose,
  onSelect,
}: {
  open: boolean;
  agents: AgentDefinition[];
  projectName?: string;
  onClose: () => void;
  onSelect: (agentId: AgentId) => Promise<void>;
}) {
  const choices = agents.filter((agent) => agent.enabled);
  const [selected, setSelected] = useState<AgentId | undefined>(choices[0]?.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (open) {
      setSelected(choices[0]?.id);
      setError(undefined);
    }
  }, [open, choices[0]?.id]);

  async function start() {
    if (!selected) return;
    setLoading(true);
    setError(undefined);
    try {
      await onSelect(selected);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "无法启动 Agent");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="选择 Agent"
      description={
        projectName ? `为 ${projectName} 启动一个新对话。` : "选择负责创建新项目的 Agent。"
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button disabled={!selected} loading={loading} onClick={() => void start()}>
            启动对话 <ArrowRight size={15} />
          </Button>
        </>
      }
    >
      <fieldset className="agent-picker" aria-label="Agent">
        {choices.map((agent) => (
          <button
            type="button"
            key={agent.id}
            className={selected === agent.id ? "is-selected" : ""}
            onClick={() => setSelected(agent.id)}
            aria-pressed={selected === agent.id}
          >
            <span className="agent-picker__mark">
              {selected === agent.id ? <Check size={16} /> : agent.name.slice(0, 1)}
            </span>
            <span>
              <strong>{agent.name}</strong>
              <small>{agent.description}</small>
              {agent.availabilityNote ? <em>{agent.availabilityNote}</em> : null}
            </span>
          </button>
        ))}
      </fieldset>
      <div className="dialog-warning">
        <AlertTriangle size={16} />
        <span>该 Agent 将以自动批准模式启动，并可修改当前项目文件。</span>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
    </Modal>
  );
}

export function ProjectSettingsDialog({
  open,
  project,
  agents,
  onClose,
  onSave,
  onInstallSkill,
  onDelete,
}: {
  open: boolean;
  project?: Project;
  agents: AgentDefinition[];
  onClose: () => void;
  onSave: (patch: Partial<Project>) => Promise<void>;
  onInstallSkill: (source: string, agents: AgentId[]) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [tab, setTab] = useState<"general" | "skills" | "instructions">("general");
  const [draft, setDraft] = useState<Project | undefined>(project);
  const [skillSource, setSkillSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (open) {
      setDraft(project);
      setTab("general");
      setError(undefined);
    }
  }, [open, project]);
  if (!project || !draft) return null;

  async function save() {
    setSaving(true);
    setError(undefined);
    try {
      await onSave({
        name: draft?.name,
        path: draft?.path,
        agentIds: draft?.agentIds,
        agentsMd: draft?.agentsMd,
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function installSkill() {
    if (!skillSource.trim()) return;
    setSaving(true);
    setError(undefined);
    try {
      await onInstallSkill(skillSource.trim(), draft?.agentIds || []);
      setSkillSource("");
    } catch (installError) {
      setError(installError instanceof Error ? installError.message : "Skill 安装失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`${project.name} 设置`}
      description="配置项目范围内的 Agent、Skills 与指令文件。"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button loading={saving} onClick={() => void save()}>
            保存更改
          </Button>
        </>
      }
    >
      <div className="dialog-tabs" role="tablist">
        <button
          type="button"
          className={tab === "general" ? "is-active" : ""}
          onClick={() => setTab("general")}
        >
          常规
        </button>
        <button
          type="button"
          className={tab === "skills" ? "is-active" : ""}
          onClick={() => setTab("skills")}
        >
          Skills
        </button>
        <button
          type="button"
          className={tab === "instructions" ? "is-active" : ""}
          onClick={() => setTab("instructions")}
        >
          AGENTS.md
        </button>
      </div>
      {tab === "general" ? (
        <div className="dialog-form">
          <Field label="项目名称">
            <input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </Field>
          <Field label="项目路径">
            <input
              value={draft.path}
              onChange={(event) => setDraft({ ...draft, path: event.target.value })}
            />
          </Field>
          <div className="project-agent-toggles">
            <span>可用 Agents</span>
            {agents
              .filter((agent) => agent.enabled)
              .map((agent) => (
                <Switch
                  key={agent.id}
                  label={agent.name}
                  checked={draft.agentIds.includes(agent.id)}
                  onChange={(checked) =>
                    setDraft({
                      ...draft,
                      agentIds: checked
                        ? [...draft.agentIds, agent.id]
                        : draft.agentIds.filter((id) => id !== agent.id),
                    })
                  }
                />
              ))}
          </div>
          <div className="delete-project-row">
            <div>
              <strong>从 AgentDock 移除</strong>
              <span>不会删除项目目录中的任何文件。</span>
            </div>
            <Button variant="danger" onClick={() => void onDelete()}>
              <Trash2 size={15} /> 移除项目
            </Button>
          </div>
        </div>
      ) : null}
      {tab === "skills" ? (
        <div className="skills-editor">
          <div className="skills-editor__install">
            <Field
              label="安装项目 Skill"
              hint="在项目目录中执行 bunx skills add，并同步到所选 Agent。"
            >
              <input
                value={skillSource}
                onChange={(event) => setSkillSource(event.target.value)}
                placeholder="github:owner/repository 或 URL"
              />
            </Field>
            <Button
              variant="secondary"
              disabled={!skillSource.trim()}
              loading={saving}
              onClick={() => void installSkill()}
            >
              <PackagePlus size={15} /> 安装
            </Button>
          </div>
          <div className="installed-skills">
            <h3>已登记</h3>
            {project.skills.length ? (
              project.skills.map((skill) => (
                <div key={skill}>
                  <Sparkles size={15} />
                  <span>{skill}</span>
                </div>
              ))
            ) : (
              <p>还没有项目级 Skill。安装后会同时生成 skills-lock.json。</p>
            )}
          </div>
        </div>
      ) : null}
      {tab === "instructions" ? (
        <div className="instructions-editor">
          <div className="instructions-editor__note">
            <FileCode2 size={16} />
            <span>
              根目录 AGENTS.md 是统一来源。保存时会为 Claude Code 生成 CLAUDE.md 桥接文件；
              Antigravity CLI 会直接读取 AGENTS.md。
            </span>
          </div>
          <textarea
            value={draft.agentsMd}
            onChange={(event) => setDraft({ ...draft, agentsMd: event.target.value })}
            spellCheck={false}
            placeholder="# Project instructions\n\nDescribe build, test, and code conventions here…"
          />
        </div>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
    </Modal>
  );
}

export function ConfirmResetDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [preserve, setPreserve] = useState(true);
  const [loading, setLoading] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="重置运行环境？"
      description="这会停止当前会话并移除 Ubuntu rootfs。"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="danger"
            loading={loading}
            onClick={async () => {
              setLoading(true);
              try {
                await onConfirm();
                onClose();
              } finally {
                setLoading(false);
              }
            }}
          >
            确认重置
          </Button>
        </>
      }
    >
      <div className="reset-confirm">
        <div className="reset-confirm__icon">
          <Trash2 size={20} />
        </div>
        <p>项目目录不会被删除。重新初始化后需再次安装系统包。</p>
        <Switch
          checked={preserve}
          onChange={setPreserve}
          label="保留 Agent 配置与凭据"
          description="首版始终保留；工厂重置将在后续版本提供。"
          disabled
        />
      </div>
    </Modal>
  );
}
