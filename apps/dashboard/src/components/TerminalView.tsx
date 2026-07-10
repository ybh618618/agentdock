import type { Session, TerminalServerMessage } from "@agentdock/shared";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal } from "@xterm/xterm";
import { Clipboard, Maximize2, RefreshCw, TerminalSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, IconButton, StatusDot } from "./ui";

export interface TerminalViewProps {
  session: Session;
  agentName: string;
  dark: boolean;
  onRestart: () => Promise<void>;
  compact?: boolean;
}

export function TerminalView({
  session,
  agentName,
  dark,
  onRestart,
  compact = false,
}: TerminalViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | undefined>(undefined);
  const [connection, setConnection] = useState<"connecting" | "connected" | "closed" | "error">(
    "connecting",
  );
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setConnection("connecting");
    const terminal = new Terminal({
      allowProposedApi: false,
      cursorBlink: true,
      cursorStyle: "bar",
      fontFamily:
        '"JetBrains Mono Variable", "Noto Sans SC Variable", "SFMono-Regular", Consolas, monospace',
      fontSize: compact ? 12 : 13,
      fontWeight: "400",
      fontWeightBold: "600",
      lineHeight: 1.45,
      letterSpacing: 0,
      scrollback: 10_000,
      screenReaderMode: true,
      theme: dark
        ? {
            background: "oklch(0.075 0 0)",
            foreground: "oklch(0.93 0.006 120)",
            cursor: "oklch(0.76 0.12 120)",
            selectionBackground: "oklch(0.29 0.05 120)",
            black: "oklch(0.12 0 0)",
            brightBlack: "oklch(0.56 0.01 120)",
            green: "oklch(0.76 0.12 120)",
            brightGreen: "oklch(0.84 0.11 120)",
            red: "oklch(0.69 0.16 27)",
            brightRed: "oklch(0.79 0.12 27)",
            yellow: "oklch(0.76 0.12 75)",
            blue: "oklch(0.72 0.11 250)",
            magenta: "oklch(0.72 0.12 315)",
            cyan: "oklch(0.72 0.1 180)",
            white: "oklch(0.93 0.006 120)",
            brightWhite: "oklch(1 0 0)",
          }
        : {
            background: "oklch(1 0 0)",
            foreground: "oklch(0.18 0.012 120)",
            cursor: "oklch(0.43 0.105 120)",
            selectionBackground: "oklch(0.9 0.06 120)",
            black: "oklch(0.18 0.012 120)",
            brightBlack: "oklch(0.49 0.01 120)",
            green: "oklch(0.43 0.105 120)",
            brightGreen: "oklch(0.55 0.12 120)",
            red: "oklch(0.49 0.17 27)",
            brightRed: "oklch(0.57 0.17 27)",
            yellow: "oklch(0.5 0.12 75)",
            blue: "oklch(0.5 0.12 250)",
            magenta: "oklch(0.5 0.12 315)",
            cyan: "oklch(0.5 0.1 180)",
            white: "oklch(0.92 0.005 120)",
            brightWhite: "oklch(1 0 0)",
          },
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.loadAddon(new WebLinksAddon());
    terminal.open(host);
    terminalRef.current = terminal;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(
      `${protocol}//${window.location.host}/ws/terminals/${encodeURIComponent(session.id)}`,
    );
    const resize = () => {
      try {
        fit.fit();
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "resize", cols: terminal.cols, rows: terminal.rows }));
        }
      } catch {
        // The host may be between responsive layout states.
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const input = terminal.onData((data) => {
      if (socket.readyState === WebSocket.OPEN)
        socket.send(JSON.stringify({ type: "input", data }));
    });
    socket.addEventListener("open", () => {
      setConnection("connected");
      resize();
    });
    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(String(event.data)) as TerminalServerMessage;
        if (message.type === "output" && message.data) terminal.write(message.data);
        if (message.type === "error") {
          setConnection("error");
          terminal.writeln(`\r\n\x1b[31m${message.data || "终端连接失败"}\x1b[0m`);
        }
        if (message.type === "exit") {
          setConnection("closed");
          terminal.writeln(`\r\n\x1b[90m[进程已退出，状态码 ${message.code ?? "未知"}]\x1b[0m`);
        }
      } catch {
        terminal.writeln("\r\n\x1b[31m[无法解析服务器消息]\x1b[0m");
      }
    });
    socket.addEventListener("close", () =>
      setConnection((current) => (current === "closed" ? current : "closed")),
    );
    socket.addEventListener("error", () => setConnection("error"));
    requestAnimationFrame(resize);

    return () => {
      observer.disconnect();
      input.dispose();
      socket.close();
      terminal.dispose();
      terminalRef.current = undefined;
    };
  }, [session.id, dark, compact]);

  async function restart() {
    setRestarting(true);
    try {
      await onRestart();
    } finally {
      setRestarting(false);
    }
  }

  return (
    <section
      className={`terminal-panel ${compact ? "terminal-panel--compact" : ""}`}
      aria-label={`${agentName} 终端`}
    >
      <header className="terminal-panel__header">
        <div className="terminal-panel__identity">
          <TerminalSquare size={16} aria-hidden="true" />
          <strong>{agentName}</strong>
          <span className="terminal-panel__connection">
            <StatusDot
              status={
                connection === "connected" ? "ready" : connection === "error" ? "error" : "offline"
              }
            />
            {connection === "connecting"
              ? "连接中"
              : connection === "connected"
                ? "已连接"
                : connection === "error"
                  ? "连接错误"
                  : "已停止"}
          </span>
        </div>
        <div className="terminal-panel__actions">
          <IconButton
            label="复制选中内容"
            onClick={() => {
              const selection = terminalRef.current?.getSelection();
              if (selection) void navigator.clipboard.writeText(selection);
            }}
          >
            <Clipboard size={15} />
          </IconButton>
          <IconButton label="聚焦终端" onClick={() => terminalRef.current?.focus()}>
            <Maximize2 size={15} />
          </IconButton>
          {connection !== "connected" && session.kind === "agent" ? (
            <Button variant="secondary" loading={restarting} onClick={restart}>
              <RefreshCw size={14} /> 重新启动
            </Button>
          ) : null}
        </div>
      </header>
      <div ref={hostRef} className="terminal-host" />
    </section>
  );
}
