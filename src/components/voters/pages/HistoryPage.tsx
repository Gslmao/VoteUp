"use client";

import React, { useEffect, useState } from "react";
import { ParticipationRecord } from "@/types/voter";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/voters/common/StatusBadge";
import { PageHeading } from "@/components/voters/common/PageHeading";
import { EmptyState } from "@/components/voters/common/EmptyState";
import { getApiJson } from "@/lib/portalBackend";

export function HistoryPage() {
  const [rows, setRows] = useState<ParticipationRecord[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    void getApiJson<{
      profile: { constituency_name: string };
      history: {
        election_id: number;
        voted_at: string;
        elections: { election_name: string; start_date: string } | null;
      }[];
    }>("/api/voter/me")
      .then((session) => setRows(session.history.map((record) => ({
        id: `${record.election_id}`,
        voterId: "",
        electionName: record.elections?.election_name ?? `Election ${record.election_id}`,
        date: formatDate(record.voted_at),
        constituency: session.profile.constituency_name,
        status: "Participated",
        receipt: "Not available",
      }))))
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : "Unable to load participation history.");
      });
  }, []);

  return (
    <main id="main-content" className="app-main">
      <div className="shell">
        <PageHeading
          eyebrow="Participation records"
          title="Voting history"
          description="See your recorded participation without revealing candidate selections."
        />
        <div className="privacy-banner">
          <Icon name="vote" />
          <div>
            <strong>Your candidate selection is never shown here</strong>
            <span>
              Participation history records whether a vote was submitted, not
              who was selected.
            </span>
          </div>
        </div>

        {rows.length ? (
          <section className="panel table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Election</th>
                    <th>Recorded date</th>
                    <th>Constituency</th>
                    <th>Participation</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.electionName}</strong>
                      </td>
                      <td>{r.date}</td>
                      <td>{r.constituency}</td>
                      <td>
                        <StatusBadge status="Participated" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-records">
              {rows.map((r) => (
                <div className="mobile-record" key={r.id}>
                  <StatusBadge status="Participated" />
                  <h3>{r.electionName}</h3>
                  <p>
                    {r.constituency} · {r.date}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <EmptyState
            icon="history"
            title="No participation history"
            text="Any completed simulated voting demonstration will appear here."
          />
        )}
        {loadError && <div className="form-alert" role="alert">{loadError}</div>}
      </div>
    </main>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}
