import { lazy, Suspense } from "react";
import type { TerminalViewProps } from "./TerminalView";

const TerminalView = lazy(() =>
  import("./TerminalView").then((module) => ({ default: module.TerminalView })),
);

export function LazyTerminalView(props: TerminalViewProps) {
  return (
    <Suspense
      fallback={
        <div
          className="terminal-panel terminal-panel--loading"
          role="status"
          aria-label="正在加载终端"
        >
          <div className="terminal-loading-lines" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      }
    >
      <TerminalView {...props} />
    </Suspense>
  );
}
