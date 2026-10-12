"use client";

import React, { useCallback, useEffect, useState } from "react";
import { EntityPageProps, PageKey, Store, ToastState, Voter } from "@/types/portal";
import { navItems, seedStore, seedVoters } from "@/data/mockData";
import { nextId } from "@/lib/formatters";
import { Login } from "@/components/auth/Login";
import { AppShell } from "@/components/layout/AppShell";
import { OverviewPage } from "@/components/pages/OverviewPage";
import { ElectionsPage } from "@/components/pages/ElectionsPage";
import { ConstituenciesPage } from "@/components/pages/ConstituenciesPage";
import { PartiesPage } from "@/components/pages/PartiesPage";
import { CandidatesPage } from "@/components/pages/CandidatesPage";
import { NominationsPage } from "@/components/pages/NominationsPage";
import { VotersPage } from "@/components/pages/VotersPage";
import { ComplaintsPage } from "@/components/pages/ComplaintsPage";
import { ObserversPage } from "@/components/pages/ObserversPage";
import { ResultsPage } from "@/components/pages/ResultsPage";
import { AuditPage } from "@/components/pages/AuditPage";
import { getApiJson, loadAdminPortalData } from "@/lib/portalBackend";

interface PortalAppProps {
  initialRoute?: PageKey;
}

export function PortalApp({ initialRoute }: PortalAppProps) {
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [turnout, setTurnout] = useState<{
    votesCast: number;
    registeredVoters: number;
    percentage: number;
    electionName: string;
  } | null>(null);
  const [page, setPage] = useState<PageKey>(initialRoute ?? "overview");
  const [store, setStore] = useState<Store>(seedStore);
  const [voters, setVoters] = useState<Voter[]>(seedVoters);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Sync session and local storage on client mount
  useEffect(() => {
    const mountTimeout = window.setTimeout(() => setMounted(true), 0);
    const hydrationTimeout = window.setTimeout(() => {
      try {
        const savedStore = localStorage.getItem("ecap-demo-store");
        if (savedStore) {
          const parsed = JSON.parse(savedStore);
          if (!parsed.parties) {
            parsed.parties = seedStore.parties;
          }
          setStore(parsed);
        }
      } catch {
        // Ignore malformed local demonstration data.
      }

      const pathRoute = window.location.pathname.split("/")[1] as PageKey;
      if (navItems.some((n) => n.key === pathRoute)) {
        setPage(pathRoute);
      } else if (initialRoute) {
        setPage(initialRoute);
      }
    }, 0);

    if (sessionStorage.getItem("ecap-session") === "active") {
      void loadAdminPortalData()
        .then((data) => {
          const { voters: backendVoters, turnout: backendTurnout, ...backendStore } = data;
          setStore((current) => ({ ...current, ...backendStore }));
          setVoters(backendVoters);
          setTurnout(backendTurnout);
          setBackendConnected(true);
          setLoggedIn(true);
        })
        .catch(() => {
          sessionStorage.removeItem("ecap-session");
          setBackendConnected(false);
          setLoggedIn(false);
        });
    }

    return () => {
      window.clearTimeout(mountTimeout);
      window.clearTimeout(hydrationTimeout);
    };
  }, [initialRoute]);

  // Persist store to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("ecap-demo-store", JSON.stringify(store));
    }
  }, [store, mounted]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const p = (window.location.pathname.split("/")[1] || "overview") as PageKey;
      if (navItems.some((n) => n.key === p)) {
        setPage(p);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  const go = (p: PageKey) => {
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", `/${p}`);
    }
    setPage(p);
  };

  const notify = useCallback((text: string, tone: "success" | "error" = "success") => {
    setToast({ text, tone });
  }, []);

  const addAudit = (
    entity: string,
    operation: string,
    reference: string,
    details: string
  ) => {
    setStore((s) => ({
      ...s,
      audits: [
        {
          id: nextId("AUD"),
          timestamp: new Date().toISOString(),
          entity,
          operation,
          reference,
          details,
        },
        ...s.audits,
      ],
    }));
  };

  const create = (key: keyof Store, item: never, detail: string) => {
    setStore((s) => ({
      ...s,
      [key]: [item, ...s[key]],
    }));
    const record = item as { id: string };
    if (!backendConnected) {
      addAudit(key.slice(0, -1), "CREATE", record.id, detail);
    }
    notify(detail);
  };

  const update = (key: keyof Store, item: never, detail: string) => {
    const record = item as { id: string };
    setStore((s) => ({
      ...s,
      [key]: (s[key] as Array<{ id: string }>).map((r) =>
        r.id === record.id ? item : r
      ),
    }));
    if (!backendConnected) {
      addAudit(key.slice(0, -1), "UPDATE", record.id, detail);
    }
    notify(detail);
  };

  const remove = (key: keyof Store, id: string, detail: string) => {
    setStore((s) => ({
      ...s,
      [key]: (s[key] as Array<{ id: string }>).filter((r) => r.id !== id),
    }));
    if (!backendConnected) {
      addAudit(key.slice(0, -1), "DELETE", id, detail);
    }
    notify(detail);
  };

  const signIn = async (email: string, password: string) => {
    await getApiJson<{ success: boolean }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = await loadAdminPortalData();
    const { voters: backendVoters, turnout: backendTurnout, ...backendStore } = data;
    setStore((current) => ({ ...current, ...backendStore }));
    setVoters(backendVoters);
    setTurnout(backendTurnout);
    setBackendConnected(true);
    sessionStorage.setItem("ecap-session", "active");
    setLoggedIn(true);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/overview");
    }
    setPage("overview");
  };

  const logout = () => {
    sessionStorage.removeItem("ecap-session");
    setLoggedIn(false);
    setBackendConnected(false);
    setTurnout(null);
    void getApiJson<{ success: boolean }>("/api/admin/login", {
      method: "DELETE",
    }).catch((error: unknown) => {
      console.error("Admin logout failed:", error);
    });
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/login");
    }
  };

  // If not authenticated, show Login screen
  if (mounted && !loggedIn) {
    return <Login onLogin={signIn} />;
  }

  const entityPageProps: EntityPageProps = {
    store,
    voters,
    setVoters,
    create,
    update,
    remove,
    addAudit,
    notify,
    backendConnected,
  };

  return (
    <AppShell
      page={page}
      onNavigate={go}
      onLogout={logout}
      toast={toast}
      onCloseToast={() => setToast(null)}
    >
      {page === "overview" && (
        <OverviewPage
          store={store}
          voters={voters}
          go={go}
          backendConnected={backendConnected}
          turnout={turnout}
        />
      )}
      {page === "elections" && <ElectionsPage {...entityPageProps} />}
      {page === "constituencies" && (
        <ConstituenciesPage {...entityPageProps} />
      )}
      {page === "parties" && <PartiesPage {...entityPageProps} />}
      {page === "candidates" && <CandidatesPage {...entityPageProps} />}
      {page === "nominations" && <NominationsPage {...entityPageProps} />}
      {page === "voters" && <VotersPage {...entityPageProps} />}
      {page === "complaints" && <ComplaintsPage {...entityPageProps} />}
      {page === "observers" && <ObserversPage {...entityPageProps} />}
      {page === "results" && (
        <ResultsPage store={store} backendConnected={backendConnected} />
      )}
      {page === "audit" && (
        <AuditPage store={store} backendConnected={backendConnected} notify={notify} />
      )}
    </AppShell>
  );
}
