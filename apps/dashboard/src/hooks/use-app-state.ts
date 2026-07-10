import type { AppState } from "@agentdock/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";

export function useAppState() {
  const [state, setState] = useState<AppState>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const next = await api.state();
      if (!mounted.current) return;
      setState(next);
      setError(undefined);
    } catch (requestError) {
      if (!mounted.current) return;
      setError(requestError instanceof Error ? requestError.message : "无法连接 AgentDock 服务");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const interval = window.setInterval(() => void refresh(true), 3_000);
    return () => {
      mounted.current = false;
      window.clearInterval(interval);
    };
  }, [refresh]);

  return { state, setState, error, loading, refresh };
}
