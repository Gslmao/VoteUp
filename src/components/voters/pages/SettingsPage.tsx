"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Field } from "@/components/voters/common/Field";
import { PageHeading } from "@/components/voters/common/PageHeading";
import { Toggle } from "@/components/voters/common/Toggle";

interface SettingsPageProps {
  onLogout: () => void;
  largeText: boolean;
  setLargeText: (v: boolean) => void;
  toast: (m: string) => void;
}

export function SettingsPage({
  onLogout,
  largeText,
  setLargeText,
  toast,
}: SettingsPageProps) {
  const [emailNotices, setEmailNotices] = useState(true);
  const [electionNotices, setElectionNotices] = useState(true);

  return (
    <main id="main-content" className="app-main">
      <div className="shell settings-shell">
        <PageHeading
          eyebrow="Account"
          title="Profile and settings"
          description="Manage harmless local preferences for this fictional demonstration account."
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
                <span>DEMO ACCOUNT</span>
              </div>
              <div className="details-header mini">
                <span className="large-avatar">AM</span>
                <div>
                  <h3>Aarav Mehta</h3>
                  <p>aarav@example.demo</p>
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-item">
                  <small>Masked voter ID</small>
                  <strong>DVP••••821</strong>
                </div>
                <div className="detail-item">
                  <small>Constituency</small>
                  <strong>Narmada Central</strong>
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
                text="Receive fictional reminders at the demo email."
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
                  End the current demonstration session. Local demo records
                  remain on this device.
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
