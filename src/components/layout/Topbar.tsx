"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/Icon";

interface TopbarProps {
  onOpenMobileNav: () => void;
  onLogout: () => void;
}

export function Topbar({ onOpenMobileNav, onLogout }: TopbarProps) {
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <header className="topbar">
      <button
        type="button"
        className="mobile-menu"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <Icon name="menu" />
      </button>

      <div className="identity">
        <div className="brand-mark small" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div>
          <strong>Election Commission Administration Portal</strong>
          <span>Election Management System</span>
        </div>
      </div>

      <div className="account">
        <button
          type="button"
          onClick={() => setAccountOpen(!accountOpen)}
          aria-expanded={accountOpen}
          aria-label="Account menu"
        >
          <span className="avatar">AD</span>
          <span className="account-copy">
            <strong>Administrator</strong>
            <small>System administrator</small>
          </span>
          <Icon name="chevron" size={14} />
        </button>

        {accountOpen && (
          <div className="account-menu">
            <div>
              <strong>Administrator</strong>
              <span>Prototype session</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setAccountOpen(false);
                onLogout();
              }}
            >
              <Icon name="logout" size={16} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
