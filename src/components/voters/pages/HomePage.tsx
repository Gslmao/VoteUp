"use client";

import React, { useEffect, useState } from "react";
import { ElectionRecord, VoterIconName, VoterPageKey } from "@/types/voter";
import { getApiJson } from "@/lib/portalBackend";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/voters/common/StatusBadge";
import { DemoNotice } from "@/components/voters/layout/DemoNotice";

interface HomePageProps {
  navigate: (p: VoterPageKey) => void;
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function monthLabel(value: string) {
  const month = Number(value.slice(3, 5));
  return Number.isInteger(month) && month >= 1 && month <= 12
    ? new Date(2000, month - 1, 1).toLocaleString("en", { month: "short" }).toUpperCase()
    : "—";
}

export function HomePage({ navigate }: HomePageProps) {
  const [elections, setElections] = useState<ElectionRecord[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    void getApiJson<{
      election_id: number;
      election_name: string;
      election_type: string | null;
      start_date: string;
      end_date: string;
      status: string;
    }[]>("/api/elections")
      .then((records) => setElections(records.map((record) => ({
        id: String(record.election_id),
        name: record.election_name,
        type: record.election_type ?? "Election",
        state: "",
        constituency: "All constituencies",
        startDate: formatDate(record.start_date),
        endDate: formatDate(record.end_date),
        pollingDate: formatDate(record.start_date),
        status:
          record.status === "ONGOING"
            ? "Ongoing"
            : record.status === "COMPLETED"
              ? "Completed"
              : "Upcoming",
        description: record.election_name,
      }))))
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : "Unable to load elections.");
      });
  }, []);

  const featuredElection =
    elections.find((election) => election.status === "Ongoing") ?? elections[0];

  return (
    <main id="main-content">
      <section className="service-hero">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">Citizen election services</div>
            <h1>
              Your Vote. <span>Your Voice.</span>
            </h1>
            <p>
              Access clear election information, review your voter details, explore
              eligible candidates and use citizen support services in one place.
            </p>
            <div className="hero-actions">
              <Button onClick={() => navigate("login")} icon="arrow">
                Sign in to voter services
              </Button>
              <Button onClick={() => navigate("elections")} variant="secondary">
                View elections
              </Button>
              <Button onClick={() => navigate("candidates")} variant="text">
                Explore candidates
              </Button>
            </div>
            <DemoNotice />
          </div>

          <div className="election-focus">
            <div className="focus-top">
              <span className="live-dot" />
              {featuredElection?.status === "Ongoing" ? "ONGOING ELECTION" : "ELECTION INFORMATION"}
            </div>
            <h2>{featuredElection?.name ?? "No election information available"}</h2>
            <div className="focus-detail">
              <Icon name="location" size={18} />
              <span>
                <small>Electorate</small>{featuredElection?.constituency ?? "—"}
              </span>
            </div>
            <div className="focus-detail">
              <Icon name="calendar" size={18} />
              <span>
                <small>Election period</small>
                {featuredElection
                  ? `${featuredElection.startDate} — ${featuredElection.endDate}`
                  : "—"}
              </span>
            </div>
            <Button
              onClick={() => navigate("elections")}
              variant="secondary"
              icon="arrow"
            >
              View election details
            </Button>
          </div>
        </div>
      </section>

      <section className="section shell">
        <div className="section-title">
          <div>
            <span className="eyebrow">Start here</span>
            <h2>Essential voter services</h2>
          </div>
          <p>Quick access to commonly used services and information.</p>
        </div>
        <div className="service-grid">
          {[
            [
              "document",
              "View voter details",
              "Check your registration information and eligibility status.",
              "voter-details",
            ],
            [
              "calendar",
              "Find elections",
              "See upcoming, ongoing and completed elections.",
              "elections",
            ],
            [
              "users",
              "Explore candidates",
              "Review candidates with accepted nominations.",
              "candidates",
            ],
            [
              "complaint",
              "Complaints & grievances",
              "Submit and track a demo service request.",
              "complaints",
            ],
          ].map(([icon, title, text, page]) => (
            <button
              className="service-card"
              key={title}
              onClick={() => navigate(page as VoterPageKey)}
            >
              <span className="service-icon">
                <Icon name={icon as VoterIconName} />
              </span>
              <span>
                <strong>{title}</strong>
                <small>{text}</small>
                <b>
                  Open service <Icon name="arrow" size={15} />
                </b>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="section alt-section">
        <div className="shell two-column">
          <div>
            <div className="section-title">
              <div>
                <span className="eyebrow">Election calendar</span>
                <h2>Upcoming and ongoing</h2>
              </div>
              <button
                className="text-link"
                onClick={() => navigate("elections")}
              >
                View all elections <Icon name="arrow" size={16} />
              </button>
            </div>
            <div className="compact-list">
              {elections.slice(0, 3).map((e) => (
                <button
                  key={e.id}
                  className="compact-election"
                  onClick={() => navigate("elections")}
                >
                  <span className="date-block">
                    <b>{e.pollingDate.slice(0, 2)}</b>
                    <small>{monthLabel(e.pollingDate)}</small>
                  </span>
                  <span>
                    <strong>{e.name}</strong>
                    <small>
                      {e.type}
                    </small>
                  </span>
                  <StatusBadge status={e.status} />
                  <Icon name="chevron" size={18} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="section-title">
              <div>
                <span className="eyebrow">Latest updates</span>
                <h2>Announcements</h2>
              </div>
            </div>
            <div className="announcements">
              <div className="announcement">
                <span>INFO</span>
                <div>
                  <small>Connected data</small>
                  <strong>Election information is retrieved from the application database.</strong>
                </div>
              </div>
              {loadError && <div className="form-alert" role="alert">{loadError}</div>}
              {!loadError && elections.length === 0 && (
                <div className="announcement">
                  <span>—</span>
                  <div><small>Election schedule</small><strong>No elections are available right now.</strong></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
