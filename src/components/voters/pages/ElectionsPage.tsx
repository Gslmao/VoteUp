"use client";

import React, { useState } from "react";
import { ElectionRecord, VoterPageKey } from "@/types/voter";
import { elections } from "@/data/voterData";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/voters/common/StatusBadge";
import { PageHeading } from "@/components/voters/common/PageHeading";
import { EmptyState } from "@/components/voters/common/EmptyState";

interface ElectionsPageProps {
  navigate: (p: VoterPageKey) => void;
}

export function ElectionsPage({ navigate }: ElectionsPageProps) {
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ElectionRecord | null>(null);

  const visible = elections.filter(
    (e) =>
      (status === "All" || e.status === status) &&
      `${e.name} ${e.state} ${e.constituency}`
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <main id="main-content" className="app-main">
      <div className="shell">
        <PageHeading
          eyebrow="Election information"
          title="Elections"
          description="Search fictional election schedules and view eligibility, candidates and voting instructions."
        />

        <div className="filter-bar">
          <div className="search-box">
            <Icon name="search" size={18} />
            <input
              aria-label="Search elections"
              placeholder="Search by election, state or constituency"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="tabs" role="tablist">
            {["All", "Upcoming", "Ongoing", "Completed"].map((s) => (
              <button
                key={s}
                className={status === s ? "active" : ""}
                onClick={() => setStatus(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="results-meta">
          <span>
            {visible.length} election{visible.length !== 1 ? "s" : ""} found
          </span>
          <small>All dates use DD/MM/YYYY format</small>
        </div>

        <div className="election-list">
          {visible.map((e) => (
            <article className="election-card" key={e.id}>
              <div className={`election-accent ${e.status.toLowerCase()}`} />
              <div className="election-main">
                <div className="card-top">
                  <span>{e.type}</span>
                  <StatusBadge status={e.status} />
                </div>
                <h2>{e.name}</h2>
                <p>
                  <Icon name="location" size={16} /> {e.constituency}, {e.state}
                </p>
                <div className="card-dates">
                  <div>
                    <small>Start date</small>
                    <strong>{e.startDate}</strong>
                  </div>
                  <div>
                    <small>End date</small>
                    <strong>{e.endDate}</strong>
                  </div>
                  <div>
                    <small>Polling date</small>
                    <strong>{e.pollingDate}</strong>
                  </div>
                </div>
              </div>
              <div className="card-actions">
                <Button variant="secondary" onClick={() => setSelected(e)}>
                  View details
                </Button>
                {e.status === "Ongoing" && e.constituency === "Narmada Central" ? (
                  <Button onClick={() => navigate("vote")}>Voting demo</Button>
                ) : (
                  <span className="disabled-explain">
                    <Button disabled>Voting unavailable</Button>
                    <small>
                      {e.status === "Upcoming"
                        ? "Voting has not started"
                        : e.status === "Completed"
                        ? "Election completed"
                        : "Not your constituency"}
                    </small>
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>

        {!visible.length && (
          <EmptyState
            icon="search"
            title="No elections found"
            text="Try a different search term or status filter."
          />
        )}

        {selected && (
          <div
            className="modal-backdrop"
            onMouseDown={() => setSelected(null)}
          >
            <div
              className="modal wide-modal"
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={() => setSelected(null)}
                aria-label="Close modal"
              >
                <Icon name="close" />
              </button>
              <div className="card-top">
                <span>{selected.type}</span>
                <StatusBadge status={selected.status} />
              </div>
              <h2>{selected.name}</h2>
              <p>{selected.description}</p>
              <div className="modal-facts">
                <div>
                  <small>Constituency</small>
                  <strong>
                    {selected.constituency}, {selected.state}
                  </strong>
                </div>
                <div>
                  <small>Polling date</small>
                  <strong>{selected.pollingDate}</strong>
                </div>
                <div>
                  <small>Your eligibility</small>
                  <strong>
                    {selected.constituency === "Narmada Central"
                      ? "Eligible (mock record)"
                      : "Not eligible"}
                  </strong>
                </div>
              </div>
              <div className="instruction-box">
                <strong>Voting instructions</strong>
                <p>
                  Review candidate information before entering the simulated
                  voting flow. Only ongoing, eligible elections can be selected.
                </p>
              </div>
              <div className="modal-actions" style={{ marginTop: "18px" }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelected(null);
                    navigate("candidates");
                  }}
                >
                  View candidates
                </Button>
                {selected.status === "Ongoing" &&
                  selected.constituency === "Narmada Central" && (
                    <Button onClick={() => navigate("vote")}>
                      Start voting demo
                    </Button>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
