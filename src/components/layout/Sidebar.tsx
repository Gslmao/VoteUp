"use client";

import React from "react";
import { PageKey } from "@/types/portal";
import { navItems } from "@/data/mockData";
import { Icon } from "@/components/ui/Icon";

interface SidebarProps {
  page: PageKey;
  onNavigate: (key: PageKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  page,
  onNavigate,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      {mobileOpen && (
        <div
          className="nav-scrim"
          onClick={onCloseMobile}
          role="presentation"
        />
      )}

      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""} ${
          mobileOpen ? "mobile-open" : ""
        }`}
      >
        <div className="nav-label">
          {!collapsed && "ADMINISTRATION"}
          <button
            type="button"
            onClick={onCloseMobile}
            className="mobile-close"
            aria-label="Close navigation"
          >
            <Icon name="close" />
          </button>
        </div>

        <nav aria-label="Primary">
          {navItems.map((n) => (
            <button
              key={n.key}
              type="button"
              className={page === n.key ? "active" : ""}
              onClick={() => onNavigate(n.key)}
              title={collapsed ? n.label : undefined}
            >
              <Icon name={n.icon} />
              <span>{n.label}</span>
              {page === n.key && <i />}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon name="collapse" />
          <span>Collapse sidebar</span>
        </button>
      </aside>
    </>
  );
}
