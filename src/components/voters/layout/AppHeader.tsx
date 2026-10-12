"use client";

import React, { useState } from "react";
import Link from "next/link";
import { VoterIconName, VoterPageKey } from "@/types/voter";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { VoterProfile } from "@/types/voter";

interface AppHeaderProps {
  loggedIn: boolean;
  current: VoterPageKey;
  navigate: (p: VoterPageKey) => void;
  onLogout: () => void;
  voter: VoterProfile | null;
}

export function AppHeader({
  loggedIn,
  current,
  navigate,
  onLogout,
  voter,
}: AppHeaderProps) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const nav: [VoterPageKey, string, VoterIconName][] = loggedIn
    ? [
        ["dashboard", "Dashboard", "home"],
        ["elections", "Elections", "calendar"],
        ["candidates", "Candidates", "users"],
        ["vote", "Cast vote", "vote"],
        ["history", "History", "history"],
        ["complaints", "Complaints", "complaint"],
      ]
    : [
        ["home", "Home", "home"],
        ["elections", "Elections", "calendar"],
        ["candidates", "Candidates", "users"],
        ["help", "Help", "help"],
      ];

  const go = (page: VoterPageKey) => {
    navigate(page);
    setOpen(false);
    setProfileOpen(false);
  };
  const initials = voter?.full_name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() ?? "V";

  return (
    <header className="site-header">
      <div className="gov-strip">
        <div className="shell gov-strip-inner">
          <span>भारत सरकार सेवाओं का प्रदर्शन</span>
          <span>Government services demonstration</span>
          <span className="gov-tools">
            <Link href="/admin" style={{ color: "#d9e4ef", textDecoration: "none", marginRight: "12px" }}>
              Admin Portal →
            </Link>
            Skip to main content <span aria-hidden="true">|</span> A− &nbsp; A &nbsp; A+
          </span>
        </div>
      </div>

      <div className="shell identity-row">
        <button
          className="identity"
          onClick={() => go(loggedIn ? "dashboard" : "home")}
          aria-label="Election Services Portal home"
        >
          <span className="identity-mark">
            <span />
            <Icon name="vote" size={25} />
            <span />
          </span>
          <span>
            <strong>Election Services Portal</strong>
            <small>Citizen services · Prototype</small>
          </span>
        </button>

        <div className="header-actions">
          {loggedIn ? (
            <>
              <button className="icon-btn notification-btn" aria-label="Notifications">
                <Icon name="bell" />
                <span className="notification-dot" />
              </button>
              <div className="profile-wrap">
                <button
                  className="profile-button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  aria-expanded={profileOpen}
                >
                  <span className="avatar">{initials}</span>
                  <span className="profile-name">
                    {voter?.full_name ?? "Voter"}
                    <small>Voter account</small>
                  </span>
                  <Icon name="chevron" size={16} />
                </button>
                {profileOpen && (
                  <div className="profile-menu">
                    <button onClick={() => go("settings")}>
                      <Icon name="settings" size={17} /> Profile & settings
                    </button>
                    <button onClick={onLogout}>
                      <Icon name="logout" size={17} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Button onClick={() => go("login")} variant="primary" icon="arrow">
              Sign in
            </Button>
          )}

          <button
            className="mobile-menu-btn"
            onClick={() => setOpen(!open)}
            aria-label="Open navigation"
          >
            {open ? <Icon name="close" /> : <Icon name="menu" />}
          </button>
        </div>
      </div>

      <nav className={`main-nav ${open ? "open" : ""}`} aria-label="Primary navigation">
        <div className="shell nav-inner">
          {nav.map(([page, label, icon]) => (
            <button
              key={page}
              onClick={() => go(page)}
              className={current === page ? "active" : ""}
            >
              <Icon name={icon} size={17} />
              {label}
            </button>
          ))}
          {loggedIn && (
            <button className="mobile-only" onClick={() => go("settings")}>
              <Icon name="settings" size={17} />
              Settings
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
