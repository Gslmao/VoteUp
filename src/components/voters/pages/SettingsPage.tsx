"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Field } from "@/components/voters/common/Field";
import { PageHeading } from "@/components/voters/common/PageHeading";
import { Toggle } from "@/components/voters/common/Toggle";
import { VoterProfile } from "@/types/voter";

interface SettingsPageProps {
  onLogout: () => void;
  largeText: boolean;
  setLargeText: (v: boolean) => void;
  toast: (m: string) => void;
  voter: VoterProfile | null;
}

export function SettingsPage({
  onLogout,
  largeText,
  setLargeText,
  toast,
  voter,
}: SettingsPageProps) {
  const [emailNotices, setEmailNotices] = useState(true);
  const [electionNotices, setElectionNotices] = useState(true);

  return (
    <main id="main-content" className="app-main">
      <div className="shell settings-shell">
        <PageHeading
          eyebrow="Account"
          title="Profile and settings"
          description="Manage accessibility preferences and review your voter account."
        />

        <div className="settings-layout">
          <aside className="settings-nav">
            <button className="active">
              <Icon name="profile" /> Profile
            </button>
            <button>
              <Icon name="bell" /> Notifications
            </button>
            <button>
              <Icon name="settings" /> Accessibility
            </button>
          </aside>

          <div className="settings-content">
            <section className="panel settings-section">
              <div className="settings-heading">
                <h2>Profile information</h2>
                <span>VOTER ACCOUNT</span>
              </div>
              <div className="details-header mini">
                <span className="large-avatar">
                  {voter?.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() ?? "V"}
                </span>
                <div>
                  <h3>{voter?.full_name ?? "Voter"}</h3>
                  <p>
                    EPIC number: {voter?.epic_number
                      ? `${voter.epic_number.slice(0, 3)}••••${voter.epic_number.slice(-3)}`
                      : "Unavailable"}
                  </p>
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-item">
                  <small>Masked voter ID</small>
                  <strong>
                    {voter?.epic_number
                      ? `${voter.epic_number.slice(0, 3)}••••${voter.epic_number.slice(-3)}`
                      : "Unavailable"}
                  </strong>
                </div>
                <div className="detail-item">
                  <small>Constituency</small>
                  <strong>{voter?.constituency_name ?? "—"}</strong>
                </div>
              </div>
            </section>

            <section className="panel settings-section">
              <h2>Language preference</h2>
              <p>Choose the language used by this prototype.</p>
              <Field label="Display language">
                <select defaultValue="English">
                  <option>English</option>
                  <option>हिन्दी (Demo)</option>
                </select>
              </Field>
            </section>

            <section className="panel settings-section">
              <h2>Notification preferences</h2>
              <Toggle
                checked={emailNotices}
                onChange={setEmailNotices}
                title="Email reminders"
                text="Email reminders are not configured for this account."
              />
              <Toggle
                checked={electionNotices}
                onChange={setElectionNotices}
                title="Election notifications"
                text="Show updates for elections in your constituency."
              />
            </section>

            <section className="panel settings-section">
              <h2>Accessibility</h2>
              <Toggle
                checked={largeText}
                onChange={setLargeText}
                title="Larger text"
                text="Increase the base type size across this device."
              />
              <div className="settings-actions">
                <Button onClick={() => toast("Preferences saved on this device.")}>
                  Save preferences
                </Button>
              </div>
            </section>

            <section className="panel settings-section danger-zone">
              <div>
                <h2>Sign out</h2>
                <p>
                  End the current voter session.
                </p>
              </div>
              <Button variant="danger" onClick={onLogout}>
                Sign out
              </Button>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
