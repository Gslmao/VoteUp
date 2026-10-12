"use client";

import React, { useEffect, useState } from "react";
import { EntityPageProps, PageKey, Store, ToastState, Voter } from "@/types/portal";
import { navItems, seedStore, seedVoters } from "@/data/mockData";
import { nextId } from "@/lib/formatters";
import { Login } from "@/components/auth/Login";
import { AppShell } from "@/components/layout/AppShell";
import { OverviewPage } from "@/components/pages/OverviewPage";
import { ElectionsPage } from "@/components/pages/ElectionsPage";
import { ConstituenciesPage } from "@/components/pages/ConstituenciesPage";
import { CandidatesPage } from "@/components/pages/CandidatesPage";
import { NominationsPage } from "@/components/pages/NominationsPage";
import { VotersPage } from "@/components/pages/VotersPage";
import { ComplaintsPage } from "@/components/pages/ComplaintsPage";
import { ObserversPage } from "@/components/pages/ObserversPage";
import { ResultsPage } from "@/components/pages/ResultsPage";
import { AuditPage } from "@/components/pages/AuditPage";

interface PortalAppProps {
  initialRoute?: PageKey;
}

export function PortalApp({ initialRoute }: PortalAppProps) {
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [page, setPage] = useState<PageKey>(initialRoute ?? "overview");
  const [store, setStore] = useState<Store>(seedStore);
  const [voters, setVoters] = useState<Voter[]>(seedVoters);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Sync session and local storage on client mount
  useEffect(() => {
    setMounted(true);

    const session = sessionStorage.getItem("ecap-session");
    if (session === "active") {
      setLoggedIn(true);
    }

    try {
      const savedStore = localStorage.getItem("ecap-demo-store");
      if (savedStore) {
        setStore(JSON.parse(savedStore));
      }
    } catch {
      // ignore JSON parse error
    }

    const pathRoute = window.location.pathname.split("/")[1] as PageKey;
    if (navItems.some((n) => n.key === pathRoute)) {
      setPage(pathRoute);
    } else if (initialRoute) {
      setPage(initialRoute);
    }
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

  const notify = (text: string, tone: "success" | "error" = "success") => {
    setToast({ text, tone });
  };

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
    addAudit(key.slice(0, -1), "CREATE", record.id, detail);
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
    addAudit(key.slice(0, -1), "UPDATE", record.id, detail);
    notify(detail);
  };

  const remove = (key: keyof Store, id: string, detail: string) => {
    setStore((s) => ({
      ...s,
      [key]: (s[key] as Array<{ id: string }>).filter((r) => r.id !== id),
    }));
    addAudit(key.slice(0, -1), "DELETE", id, detail);
    notify(detail);
  };

  const signIn = () => {
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
        <OverviewPage store={store} voters={voters} go={go} />
      )}
      {page === "elections" && <ElectionsPage {...entityPageProps} />}
      {page === "constituencies" && (
        <ConstituenciesPage {...entityPageProps} />
      )}
      {page === "candidates" && <CandidatesPage {...entityPageProps} />}
      {page === "nominations" && <NominationsPage {...entityPageProps} />}
      {page === "voters" && <VotersPage {...entityPageProps} />}
      {page === "complaints" && <ComplaintsPage {...entityPageProps} />}
      {page === "observers" && <ObserversPage {...entityPageProps} />}
      {page === "results" && <ResultsPage store={store} />}
      {page === "audit" && <AuditPage store={store} />}
    </AppShell>
  );
}
