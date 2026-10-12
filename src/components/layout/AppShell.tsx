"use client";

import React, { ReactNode, useState } from "react";
import { PageKey, ToastState } from "@/types/portal";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import { Toast } from "@/components/ui/Toast";

interface AppShellProps {
  page: PageKey;
  onNavigate: (key: PageKey) => void;
  onLogout: () => void;
  toast: ToastState | null;
  onCloseToast: () => void;
  children: ReactNode;
}

export function AppShell({
  page,
  onNavigate,
  onLogout,
  toast,
  onCloseToast,
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="app-shell">
      <Topbar
        onOpenMobileNav={() => setMobileNav(true)}
        onLogout={onLogout}
      />

      <Sidebar
        page={page}
        onNavigate={(p) => {
          onNavigate(p);
          setMobileNav(false);
        }}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileNav}
        onCloseMobile={() => setMobileNav(false)}
      />

      <main className={`content ${collapsed ? "content-wide" : ""}`}>
        {children}
      </main>

      <Toast toast={toast} onClose={onCloseToast} />
    </div>
  );
}
