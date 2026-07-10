import { extname, join, resolve } from "node:path";
import type { TerminalClientMessage } from "@agentdock/shared";
import { handleApi } from "./api";
import { config } from "./config";
import { runCommand } from "./lib/command";
import { apiError } from "./lib/http";
import { refreshRuntime } from "./services/lifecycle";
import { store } from "./store";
import { terminals } from "./terminals";

interface SocketData {
  sessionId: string;
  unsubscribe?: () => void;
}

const command = process.argv[2];
if (command === "--version" || command === "version") {
  const output = { name: "AgentDock", version: "0.1.0" };
  console.log(
    process.argv.includes("--json") ? JSON.stringify(output) : `${output.name} ${output.version}`,
  );
  process.exit(0);
}

if (command === "open") {
  await openDashboard(process.argv.slice(3));
  process.exit(0);
}

await startServer();

async function startServer() {
  await store.init();
  void refreshRuntime().catch((error) => console.error("Initial runtime inspection failed", error));

  const server = Bun.serve<SocketData>({
    hostname: config.host,
    port: config.port,
    async fetch(request, serverInstance) {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/ws/terminals/")) {
        if (!originAllowed(request.headers.get("origin"))) {
          return apiError(403, "origin_rejected", "WebSocket 来源不受信任");
        }
        const sessionId = decodeURIComponent(url.pathname.slice("/ws/terminals/".length));
        if (!store.snapshot().sessions.some((session) => session.id === sessionId)) {
          return apiError(404, "session_not_found", "找不到该终端会话");
        }
        return serverInstance.upgrade(request, { data: { sessionId } })
          ? undefined
          : apiError(400, "upgrade_failed", "无法升级 WebSocket 连接");
      }

      const apiResponse = await handleApi(request, url);
      if (apiResponse) return apiResponse;
      if (request.method !== "GET" && request.method !== "HEAD") {
        return apiError(405, "method_not_allowed", "该路径不支持此请求方法");
      }
      return serveDashboard(url.pathname, request.method === "HEAD");
    },
    websocket: {
      open(socket) {
        socket.data.unsubscribe = terminals.subscribe(socket.data.sessionId, (message) => {
          socket.send(JSON.stringify(message));
        });
      },
      message(socket, rawMessage) {
        try {
          const message = JSON.parse(String(rawMessage)) as TerminalClientMessage;
          if (message.type === "input" && typeof message.data === "string") {
            terminals.write(socket.data.sessionId, message.data);
          }
          if (message.type === "resize" && message.cols && message.rows) {
            terminals.resize(socket.data.sessionId, message.cols, message.rows);
          }
        } catch {
          socket.send(JSON.stringify({ type: "error", data: "终端消息格式无效" }));
        }
      },
      close(socket) {
        socket.data.unsubscribe?.();
      },
    },
    error(error) {
      console.error(error);
      return apiError(500, "server_error", "AgentDock 服务发生错误");
    },
  });

  console.log(
    `AgentDock ${store.snapshot().version} listening on http://${server.hostname}:${server.port}`,
  );
}

async function openDashboard(args: string[]): Promise<void> {
  const platformArg = args
    .find((arg) => arg.startsWith("--platform="))
    ?.slice("--platform=".length);
  const routeArg = args.find((arg) => arg.startsWith("--route="))?.slice("--route=".length) || "/";
  const routeMap: Record<string, string> = {
    "/": "#/",
    "/settings": "#/settings",
    "/projects/new": "#/",
  };
  const route = routeMap[routeArg];
  if (!route) throw new Error("Unsupported AgentDock route");

  if (platformArg === "wsl" || process.env.AGENTDOCK_RUNTIME_KIND === "wsl") {
    await runCommand(["sudo", "-n", "systemctl", "start", "agentdock.service"], {
      timeoutMs: 15_000,
    });
  } else {
    const start = await runCommand(["systemctl", "--user", "start", "agentdock.service"], {
      timeoutMs: 15_000,
    });
    if (start.exitCode !== 0) {
      const child = Bun.spawn([process.execPath, "serve"], {
        stdin: "ignore",
        stdout: "ignore",
        stderr: "ignore",
      });
      child.unref();
    }
  }

  const baseUrl = `http://${config.host}:${config.port}`;
  let healthy = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(500) });
      if (response.ok) {
        healthy = true;
        break;
      }
    } catch {
      await Bun.sleep(250);
    }
  }
  if (!healthy) throw new Error("AgentDock service did not become ready within 15 seconds");

  const target = `${baseUrl}/${route}`;
  const opener =
    platformArg === "wsl" || process.env.AGENTDOCK_RUNTIME_KIND === "wsl"
      ? ["explorer.exe", target]
      : ["xdg-open", target];
  const opened = await runCommand(opener, { timeoutMs: 10_000 });
  if (opened.exitCode !== 0) throw new Error(opened.stderr || `Could not open ${target}`);
}

async function serveDashboard(pathname: string, head: boolean): Promise<Response> {
  const decoded = decodeURIComponent(pathname);
  const requestedPath = resolve(
    config.dashboardDist,
    decoded === "/" ? "index.html" : `.${decoded}`,
  );
  const safePath = requestedPath.startsWith(`${resolve(config.dashboardDist)}/`)
    ? requestedPath
    : join(config.dashboardDist, "index.html");
  let file = Bun.file(safePath);
  if (!(await file.exists())) file = Bun.file(join(config.dashboardDist, "index.html"));
  if (!(await file.exists())) {
    return new Response(
      "AgentDock dashboard has not been built. Run `bun run dev` for development.",
      {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      },
    );
  }
  return new Response(head ? null : file, {
    headers: {
      "content-type": mimeType(file.name ? extname(file.name) : ".html"),
      "cache-control": safePath.endsWith("index.html")
        ? "no-cache"
        : "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer",
      "content-security-policy":
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' ws: wss:",
    },
  });
}

function originAllowed(origin: string | null): boolean {
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return ["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function mimeType(extension: string): string {
  const types: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".woff2": "font/woff2",
  };
  return types[extension] || "application/octet-stream";
}
