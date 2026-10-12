"use client";

import React from "react";
import { VoterIconName, VoterPageKey } from "@/types/voter";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/voters/common/StatusBadge";
import { PageHeading } from "@/components/voters/common/PageHeading";
import { DemoNotice } from "@/components/voters/layout/DemoNotice";

interface DashboardPageProps {
  navigate: (p: VoterPageKey) => void;
  voted: boolean;
}

export function DashboardPage({ navigate, voted }: DashboardPageProps) {
  return (
    <main id="main-content" className="app-main">
      <div className="shell">
        <PageHeading
          eyebrow="Voter dashboard"
          title="Welcome, Aarav"
          description="Here is your election information and the next actions available to you."
          action={
            <span className="last-updated">
              Last updated
              <br />
              <b>12/09/2025, 10:30 IST</b>
            </span>
          }
        />
        <DemoNotice compact />
        <div className="dashboard-grid">
          <section className="panel voter-summary">
            <div className="panel-title">
              <div>
                <span className="eyebrow">Your voter record</span>
                <h2>Voter summary</h2>
              </div>
              <button
                className="text-link"
                onClick={() => navigate("voter-details")}
              >
                View full details <Icon name="arrow" size={15} />
              </button>
            </div>
            <div className="voter-row">
              <span className="large-avatar">AM</span>
              <div>
                <h3>Aarav Mehta</h3>
                <p>Voter ID: DVP••••821</p>
              </div>
              <StatusBadge status="Active" />
            </div>
            <div className="summary-details">
              <div>
                <small>State</small>
                <strong>Madhya Pradesh</strong>
              </div>
              <div>
                <small>Constituency</small>
                <strong>Narmada Central</strong>
              </div>
              <div>
                <small>Registration</small>
                <StatusBadge status="Eligible" />
              </div>
            </div>
          </section>

          <section className="panel action-panel">
            <div className="eyebrow">Action required</div>
            <div className="action-icon">
              <Icon name="vote" size={25} />
            </div>
            <h2>
              {voted
                ? "Demo participation recorded"
                : "An election is open for you"}
            </h2>
            <p>
              {voted
                ? "Your local demonstration receipt is available in voting history."
                : "Review eligible candidates for the ongoing Narmada Central by-election."}
            </p>
            <Button
              onClick={() => navigate(voted ? "history" : "vote")}
              icon="arrow"
            >
              {voted ? "View voting history" : "Start voting demo"}
            </Button>
          </section>
        </div>

        <section className="panel election-panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">Relevant election</span>
              <h2>Ongoing in your constituency</h2>
            </div>
            <StatusBadge status="Ongoing" />
          </div>
          <div className="ongoing-election">
            <div>
              <h3>Madhya Pradesh Legislative Assembly By-election</h3>
              <p>
                <Icon name="location" size={17} /> Narmada Central · State
                Assembly
              </p>
            </div>
            <div className="election-facts">
              <span>
                <small>Voting period</small>
                <strong>15/09/2025 — 18/09/2025</strong>
              </span>
              <span>
                <small>Your participation</small>
                <StatusBadge
                  status={voted ? "Demo vote recorded" : "Not voted"}
                />
              </span>
            </div>
            <div className="inline-actions">
              <Button
                onClick={() => navigate("candidates")}
                variant="secondary"
              >
                View candidates
              </Button>
              <Button onClick={() => navigate("elections")} variant="text">
                Election details
              </Button>
            </div>
          </div>
        </section>

        <div className="dashboard-grid lower">
          <section className="panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">Your account</span>
                <h2>Recent activity</h2>
              </div>
            </div>
            <div className="activity-list">
              <div>
                <span className="timeline-icon">
                  <Icon name="complaint" size={17} />
                </span>
                <div>
                  <strong>Complaint assigned for review</strong>
                  <small>DEMO-GRV-10428 · 10/09/2025</small>
                </div>
                <StatusBadge status="Under Review" />
              </div>
              <div>
                <span className="timeline-icon">
                  <Icon name="profile" size={17} />
                </span>
                <div>
                  <strong>Voter details viewed</strong>
                  <small>08/09/2025</small>
                </div>
              </div>
              <div>
                <span className="timeline-icon">
                  <Icon name="calendar" size={17} />
                </span>
                <div>
                  <strong>Election schedule published</strong>
                  <small>05/09/2025</small>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">Shortcuts</span>
                <h2>Quick links</h2>
              </div>
            </div>
            <div className="quick-links">
              {[
                ["document", "My voter details", "voter-details"],
                ["users", "Candidate information", "candidates"],
                ["history", "Voting history", "history"],
                ["complaint", "My complaints", "complaints"],
              ].map(([icon, label, page]) => (
                <button
                  key={label}
                  onClick={() => navigate(page as VoterPageKey)}
                >
                  <Icon name={icon as VoterIconName} />
                  <span>{label}</span>
                  <Icon name="chevron" size={16} />
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
