"use client";

import React, { useState } from "react";
import { Store } from "@/types/portal";
import { seedResults } from "@/data/mockData";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";

interface ResultsPageProps {
  store: Store;
}

export function ResultsPage({ store: _store }: ResultsPageProps) {
  const [election, setElection] = useState(seedResults[0]?.election ?? "");
  const [constituency, setConstituency] = useState("");

  const rows = seedResults.filter(
    (r) =>
      r.election === election &&
      (!constituency || r.constituency === constituency)
  );

  const max = Math.max(...rows.map((r) => r.votes), 1);
  const isFinal = rows.length > 0 && rows.every((r) => r.declared);

  const electionOptions = Array.from(
    new Set(seedResults.map((r) => r.election))
  );
  const constituencyOptions = Array.from(
    new Set(
      seedResults
        .filter((r) => r.election === election)
        .map((r) => r.constituency)
    )
  );

  return (
    <>
      <PageHeader
        title="Results"
        description="Review fictional demonstration counts and declaration status."
      />

      <div className="result-warning">
        <Icon name="alert" size={18} />
        <span>
          <strong>
            {isFinal
              ? "Declared demonstration result"
              : "Ongoing count — not a final result"}
            .
          </strong>{" "}
          These fictional figures have no legal or official standing.
        </span>
      </div>

      <div className="filters">
        <label className="field compact">
          <span>Election</span>
          <select
            value={election}
            onChange={(e) => {
              setElection(e.target.value);
              setConstituency("");
            }}
          >
            {electionOptions.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>

        <label className="field compact">
          <span>Constituency</span>
          <select
            value={constituency}
            onChange={(e) => setConstituency(e.target.value)}
          >
            <option value="">All constituencies</option>
            {constituencyOptions.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="results-layout">
        <section className="panel comparison">
          <div className="panel-head">
            <div>
              <h2>Candidate comparison</h2>
              <p>Vote totals in selected scope</p>
            </div>
          </div>
          {rows.map((r) => (
            <div className="bar-row" key={r.id}>
              <div>
                <strong>{r.candidate}</strong>
                <span>{r.party}</span>
              </div>
              <div className="bar-track">
                <i style={{ width: `${(r.votes / max) * 100}%` }} />
              </div>
              <b>{r.votes.toLocaleString("en-IN")}</b>
            </div>
          ))}
        </section>

        <section className="panel declaration">
          <span>Declaration status</span>
          <Badge value={isFinal ? "COMPLETED" : "ONGOING"} />
          <h3>{isFinal ? "Result declared" : "Counting in progress"}</h3>
          <p>
            {isFinal
              ? rows[0]?.timestamp
              : "Vote totals remain provisional until declaration."}
          </p>
        </section>
      </div>

      <DataTable
        rows={rows}
        columns={[
          { key: "rank", label: "Rank" },
          { key: "candidate", label: "Candidate" },
          { key: "party", label: "Political party" },
          { key: "constituency", label: "Constituency" },
          {
            key: "votes",
            label: "Vote total",
            render: (r) => r.votes.toLocaleString("en-IN"),
          },
          {
            key: "declared",
            label: "Declaration",
            render: (r) => (
              <Badge value={r.declared ? "COMPLETED" : "ONGOING"} />
            ),
          },
          { key: "timestamp", label: "Declaration timestamp" },
        ]}
      />
    </>
  );
}
