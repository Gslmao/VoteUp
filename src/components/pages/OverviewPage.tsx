"use client";

import React from "react";
import { Store, Voter, PageKey } from "@/types/portal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/formatters";

interface OverviewPageProps {
  store: Store;
  voters: Voter[];
  go: (p: PageKey) => void;
}

export function OverviewPage({ store, go }: OverviewPageProps) {
  const openComplaints = store.complaints.filter((c) =>
    ["OPEN", "INVESTIGATING"].includes(c.status)
  );

  const metrics = [
    [
      "Ongoing elections",
      store.elections.filter((e) => e.status === "ONGOING").length,
      "elections" as PageKey,
    ],
    [
      "Scheduled elections",
      store.elections.filter((e) => e.status === "SCHEDULED").length,
      "elections" as PageKey,
    ],
    [
      "Registered voters",
      store.constituencies
        .reduce((n, c) => n + c.voters, 0)
        .toLocaleString("en-IN"),
      "voters" as PageKey,
    ],
    ["Candidates", store.candidates.length, "candidates" as PageKey],
    ["Open complaints", openComplaints.length, "complaints" as PageKey],
  ] as const;

  return (
    <>
      <PageHeader
        title="Overview"
        description="Operational summary and items requiring administrative attention."
      />

      <div className="demo-strip">
        <Icon name="info" size={16} />
        All figures and records in this prototype are fictional demonstration data.
      </div>

      <div className="metrics">
        {metrics.map(([label, value, route], i) => (
          <button
            key={label}
            className="metric"
            type="button"
            onClick={() => go(route)}
          >
            <span className={`metric-accent a${i}`} />
            <span>{label}</span>
            <strong>{value}</strong>
            <small>
              View records <Icon name="chevron" size={12} />
            </small>
          </button>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="panel span-2">
          <div className="panel-head">
            <div>
              <h2>Elections requiring attention</h2>
              <p>Active and upcoming electoral events</p>
            </div>
            <button type="button" onClick={() => go("elections")}>
              View all
            </button>
          </div>
          <DataTable
            rows={store.elections.filter((e) => e.status !== "COMPLETED")}
            columns={[
              { key: "name", label: "Election" },
              {
                key: "start",
                label: "Start date",
                render: (r) => formatDate(r.start),
              },
              {
                key: "status",
                label: "Status",
                render: (r) => <Badge value={r.status} />,
              },
            ]}
            pageSize={3}
          />
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Turnout snapshot</h2>
              <p>Ongoing demonstration</p>
            </div>
          </div>
          <div className="turnout">
            <strong>61.8%</strong>
            <span>Estimated participation</span>
            <div>
              <i style={{ width: "61.8%" }} />
            </div>
            <p>1,04,242 of 1,68,680 registered</p>
          </div>
          <div className="turnout-legend">
            <span>
              <i /> Recorded
            </span>
            <span>
              <i /> Remaining
            </span>
          </div>
        </section>

        <section className="panel span-2">
          <div className="panel-head">
            <div>
              <h2>Complaints requiring attention</h2>
              <p>Open cases by latest filing date</p>
            </div>
            <button type="button" onClick={() => go("complaints")}>
              Manage complaints
            </button>
          </div>
          <DataTable
            rows={openComplaints}
            columns={[
              { key: "id", label: "Reference" },
              { key: "constituency", label: "Constituency" },
              {
                key: "description",
                label: "Description",
                render: (r) => (
                  <span className="truncate">{r.description}</span>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (r) => <Badge value={r.status} />,
              },
            ]}
            pageSize={3}
          />
        </section>

        <section className="panel activity">
          <div className="panel-head">
            <div>
              <h2>Recent activity</h2>
              <p>Latest administrative changes</p>
            </div>
          </div>
          {store.audits.slice(0, 4).map((a) => (
            <div className="activity-item" key={a.id}>
              <span>
                <Icon name="history" size={15} />
              </span>
              <div>
                <strong>{a.operation.replaceAll("_", " ")}</strong>
                <p>{a.details}</p>
                <small>{new Date(a.timestamp).toLocaleString("en-IN")}</small>
              </div>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
