"use client";

import React, { useEffect, useState } from "react";
import { VoterIconName, VoterPageKey } from "@/types/voter";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/voters/common/StatusBadge";
import { PageHeading } from "@/components/voters/common/PageHeading";
import { DemoNotice } from "@/components/voters/layout/DemoNotice";
import { VoterProfile } from "@/types/voter";
import { getApiJson } from "@/lib/portalBackend";

interface DashboardPageProps {
  navigate: (p: VoterPageKey) => void;
  voter: VoterProfile | null;
}

export function DashboardPage({ navigate, voter }: DashboardPageProps) {
  const [activeElectionVoted, setActiveElectionVoted] = useState(false);
  const [activeElection, setActiveElection] = useState<{
    election_id: number;
    election_name: string;
    election_type: string | null;
    start_date: string;
    end_date: string;
  } | null>(null);
  const [electionError, setElectionError] = useState("");
  const name = voter?.full_name ?? "Voter";
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const maskedEpic = voter?.epic_number
    ? `${voter.epic_number.slice(0, 3)}••••${voter.epic_number.slice(-3)}`
    : "Unavailable";

  useEffect(() => {
    void Promise.all([
      getApiJson<{
        election_id: number;
        election_name: string;
        election_type: string | null;
        start_date: string;
        end_date: string;
      }[]>("/api/elections?status=ONGOING"),
      getApiJson<{ history: { election_id: number }[] }>("/api/voter/me"),
    ])
      .then(([records, session]) => {
        const currentElection = records[0] ?? null;
        setActiveElection(currentElection);
        setActiveElectionVoted(
          !!currentElection &&
            session.history.some((record) => record.election_id === currentElection.election_id)
        );
      })
      .catch((error: unknown) => {
        setElectionError(error instanceof Error ? error.message : "Unable to load elections.");
      });
  }, []);

  return (
    <main id="main-content" className="app-main">
      <div className="shell">
        <PageHeading
          eyebrow="Voter dashboard"
          title={`Welcome, ${name.split(/\s+/)[0]}`}
          description="Here is your voter information and the next actions available to you."
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
              <span className="large-avatar">{initials}</span>
              <div>
                <h3>{name}</h3>
                <p>Voter ID: {maskedEpic}</p>
              </div>
              <StatusBadge status="Active" />
            </div>
            <div className="summary-details">
              <div>
                <small>State</small>
                <strong>{voter?.state_name ?? "—"}</strong>
              </div>
              <div>
                <small>Constituency</small>
                <strong>{voter?.constituency_name ?? "—"}</strong>
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
              {activeElectionVoted
                ? "Participation recorded"
                : activeElection
                  ? "An election is open"
                  : "No election is currently open"}
            </h2>
            <p>
              {activeElectionVoted
                ? "Your participation record is available in voting history."
                : activeElection
                  ? "Review eligible candidates before you cast a vote."
                  : "Check the election schedule for upcoming voting periods."}
            </p>
            <Button
              onClick={() => navigate(activeElectionVoted ? "history" : activeElection ? "vote" : "elections")}
              icon="arrow"
              disabled={!activeElection && !!electionError}
            >
              {activeElectionVoted ? "View voting history" : activeElection ? "Start voting" : "View elections"}
            </Button>
          </section>
        </div>

        <section className="panel election-panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">Relevant election</span>
              <h2>Ongoing elections</h2>
            </div>
            {activeElection && <StatusBadge status="Ongoing" />}
          </div>
          {activeElection ? <div className="ongoing-election">
            <div>
              <h3>{activeElection.election_name}</h3>
              <p>
                <Icon name="location" size={17} /> {activeElection.election_type ?? "Election"}
              </p>
            </div>
            <div className="election-facts">
              <span>
                <small>Voting period</small>
                <strong>{formatDate(activeElection.start_date)} — {formatDate(activeElection.end_date)}</strong>
              </span>
              <span>
                <small>Your participation</small>
                <StatusBadge
                  status={activeElectionVoted ? "Participated" : "Not voted"}
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
          </div> : <p className="empty-note">{electionError || "No election is currently open for voting."}</p>}
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
                  <Icon name={activeElectionVoted ? "vote" : "profile"} size={17} />
                </span>
                <div>
                  <strong>{activeElectionVoted ? "Participation recorded" : "Voter account active"}</strong>
                  <small>{activeElectionVoted ? "See your voting history for details." : "Your profile is connected to the voter registry."}</small>
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

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}
