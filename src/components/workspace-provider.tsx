"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ActionResult, WorkspaceState } from "@/lib/contracts";
import { workspaceSchema } from "@/lib/contracts";
import { createSeedState } from "@/lib/seed";

const STORAGE_KEY = "clearpath-referrals:v1";
export type DomainAction = (state: WorkspaceState, now: string) => ActionResult;

type WorkspaceContextValue = {
  state: WorkspaceState;
  ready: boolean;
  storageNotice: string;
  actionMessage: string;
  reset: () => void;
  selectReferral: (id: string) => void;
  runForReferral: (id: string, action: DomainAction) => void;
  clearMessage: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(() => createSeedState());
  const [ready, setReady] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    let restored: WorkspaceState | null = null;
    let notice = "";
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = workspaceSchema.safeParse(JSON.parse(stored));
        if (parsed.success) restored = parsed.data;
        else notice = "Saved demo data was invalid, so a clean synthetic workspace was restored.";
      }
    } catch {
      notice = "Saved demo data could not be read, so a clean synthetic workspace was restored.";
    }
    queueMicrotask(() => {
      if (restored) setState(restored);
      if (notice) setStorageNotice(notice);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [ready, state]);

  const reset = useCallback(() => {
    setState(createSeedState());
    setActionMessage("Demo reset to its verified synthetic starting point.");
    setStorageNotice("");
  }, []);

  const selectReferral = useCallback((id: string) => {
    setState((current) => current.referrals.some((referral) => referral.id === id)
      ? { ...current, selectedReferralId: id }
      : current);
    setActionMessage("");
  }, []);

  const runForReferral = useCallback((id: string, action: DomainAction) => {
    setState((current) => {
      const scoped = current.selectedReferralId === id ? current : { ...current, selectedReferralId: id };
      const result = action(scoped, new Date().toISOString());
      setActionMessage(result.message);
      return result.state;
    });
  }, []);

  const value = useMemo(() => ({
    state, ready, storageNotice, actionMessage, reset, selectReferral, runForReferral,
    clearMessage: () => setActionMessage(""),
  }), [state, ready, storageNotice, actionMessage, reset, selectReferral, runForReferral]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return context;
}
