"use client";

import React, { useState } from "react";
import { participationHistory } from "@/data/voterData";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/voters/common/StatusBadge";
import { PageHeading } from "@/components/voters/common/PageHeading";
import { DemoNotice } from "@/components/voters/layout/DemoNotice";
import { EmptyState } from "@/components/voters/common/EmptyState";

interface HistoryPageProps {
  voted: boolean;
}

export function HistoryPage({ voted }: HistoryPageProps) {
  const [receipt] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("esp-demo-receipt") || "";
    }
    return "";
  });

  const rows =
    voted && receipt
      ? [
          {
            id: "local",
            voterId: "v1",
            electionName: "Madhya Pradesh Legislative Assembly By-election",
            date: "18/09/2025",
            constituency: "Narmada Central",
            status: "Participated" as const,
            receipt,
          },
          ...participationHistory,
        ]
      : participationHistory;

  return (
    <main id="main-content" className="app-main">
      <div className="shell">
        <PageHeading
          eyebrow="Participation records"
          title="Voting history"
          description="See local prototype participation records without revealing candidate selections."
        />
        <div className="privacy-banner">
          <Icon name="vote" />
          <div>
            <strong>Your candidate selection is never shown here</strong>
            <span>
              Participation history records whether the demo was completed, not
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
                    <th>Election date</th>
                    <th>Constituency</th>
                    <th>Participation</th>
                    <th>Demo receipt</th>
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
                      <td>
                        <code>{r.receipt}</code>
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
                  <code>{r.receipt}</code>
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
        <DemoNotice />
      </div>
    </main>
  );
}
