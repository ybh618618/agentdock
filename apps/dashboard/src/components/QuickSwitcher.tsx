import type { Project } from "@agentdock/shared";
import { FolderPlus, Home, MessageSquarePlus, Search, Settings } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { View } from "./Sidebar";
import { Modal } from "./ui";

export function QuickSwitcher({
  open,
  projects,
  currentProject,
  onClose,
  onNavigate,
  onAddProject,
  onNewConversation,
}: {
  open: boolean;
  projects: Project[];
  currentProject?: Project;
  onClose: () => void;
  onNavigate: (view: View) => void;
  onAddProject: () => void;
  onNewConversation: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);
  const filtered = useMemo(
    () =>
      projects.filter((project) =>
        `${project.name} ${project.path}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [projects, query],
  );

  function run(action: () => void) {
    action();
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} size="md" title="快速切换" closeLabel="关闭快速切换">
      <div className="quick-search">
        <Search size={17} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索项目或操作…"
        />
      </div>
      <div className="quick-results">
        {!query ? (
          <div className="quick-group">
            <span>操作</span>
            <button type="button" onClick={() => run(() => onNavigate({ type: "home" }))}>
              <Home size={16} />
              <strong>返回首页</strong>
              <kbd>G H</kbd>
            </button>
            <button type="button" onClick={() => run(onNewConversation)}>
              <MessageSquarePlus size={16} />
              <strong>{currentProject ? `在 ${currentProject.name} 新建对话` : "新建对话"}</strong>
              <kbd>⌘ N</kbd>
            </button>
            <button type="button" onClick={() => run(onAddProject)}>
              <FolderPlus size={16} />
              <strong>添加项目</strong>
            </button>
            <button type="button" onClick={() => run(() => onNavigate({ type: "settings" }))}>
              <Settings size={16} />
              <strong>打开设置</strong>
            </button>
          </div>
        ) : null}
        <div className="quick-group">
          <span>项目</span>
          {filtered.length ? (
            filtered.map((project) => (
              <button
                type="button"
                key={project.id}
                onClick={() => run(() => onNavigate({ type: "project", projectId: project.id }))}
              >
                <span className="quick-project-glyph">
                  {project.name.slice(0, 1).toUpperCase()}
                </span>
                <strong>{project.name}</strong>
                <small>{project.path}</small>
              </button>
            ))
          ) : (
            <p>没有匹配的项目</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
