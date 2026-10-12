"use client";

import React, { useEffect, useState } from "react";
import { ComplaintRecord, VoterPageKey } from "@/types/voter";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/voters/common/StatusBadge";
import { Field } from "@/components/voters/common/Field";
import { PageHeading } from "@/components/voters/common/PageHeading";
import { EmptyState } from "@/components/voters/common/EmptyState";
import { getApiJson } from "@/lib/portalBackend";

interface ComplaintsPageProps {
  complaints: ComplaintRecord[];
  navigate: (p: VoterPageKey) => void;
}

export function ComplaintsPage({ complaints, navigate }: ComplaintsPageProps) {
  const [records, setRecords] = useState(complaints);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState<ComplaintRecord | null>(null);

  useEffect(() => {
    void getApiJson<{
      complaint_id: number;
      election_id: number;
      description: string;
      status: string;
    }[]>("/api/complaints")
      .then((result) => {
        setRecords(result.map((record) => {
          const category = record.description.match(/^Category:\s*(.+)$/m)?.[1] ?? "General";
          const subject = record.description.match(/^Subject:\s*(.+)$/m)?.[1] ?? "Complaint";
          const details = record.description.split("\n\n").slice(1).join("\n\n");
          const status =
            record.status === "RESOLVED"
              ? "Resolved"
              : record.status === "DISMISSED"
                ? "Rejected"
                : record.status === "INVESTIGATING"
                  ? "Under Review"
                  : "Submitted";
          return {
            id: String(record.complaint_id),
            reference: `CMP-${record.complaint_id}`,
            voterId: "",
            subject,
            category,
            date: "—",
            status,
            electionId: String(record.election_id),
            description: details || record.description,
            history: [{ date: "—", label: status }],
          };
        }));
        setLoadError("");
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : "Unable to load complaints.");
      });
  }, []);

  const rows = records.filter(
    (c) =>
      (status === "All" || c.status === status) &&
      `${c.subject} ${c.reference}`
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <main id="main-content" className="app-main">
      <div className="shell">
        <PageHeading
          eyebrow="Complaints & grievances"
          title="My complaints"
          description="Search and track complaints submitted from your voter account."
          action={
            <Button onClick={() => navigate("submit-complaint")}>
              Submit new complaint
            </Button>
          }
        />

        <div className="filter-bar">
          <div className="search-box">
            <Icon name="search" size={18} />
            <input
              placeholder="Search by subject or reference"
              aria-label="Search complaints"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>All</option>
              <option>Submitted</option>
              <option>Under Review</option>
              <option>Resolved</option>
              <option>Rejected</option>
            </select>
          </Field>
        </div>

        <div className="results-meta">
          <span>
            {rows.length} complaint{rows.length !== 1 ? "s" : ""}
          </span>
          <small>Only complaints associated with your account are shown</small>
        </div>

        {loadError && <div className="form-alert" role="alert">{loadError}</div>}
        {rows.length ? (
          <section className="panel table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Reference number</th>
                    <th>Subject</th>
                    <th>Submitted</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <code>{c.reference}</code>
                      </td>
                      <td>
                        <strong>{c.subject}</strong>
                      </td>
                      <td>{c.date}</td>
                      <td>{c.category}</td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td>
                        <button
                          className="table-action"
                          onClick={() => setSelected(c)}
                        >
                          View <Icon name="chevron" size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <EmptyState
            icon="complaint"
            title="No complaints found"
            text="Try adjusting your search or status filter."
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
                <code>{selected.reference}</code>
                <StatusBadge status={selected.status} />
              </div>
              <h2>{selected.subject}</h2>
              <p>{selected.description}</p>
              <div className="modal-facts">
                <div>
                  <small>Submitted</small>
                  <strong>{selected.date}</strong>
                </div>
                <div>
                  <small>Category</small>
                  <strong>{selected.category}</strong>
                </div>
              </div>
              <h3>Status history</h3>
              <div className="status-history">
                {selected.history.map((h, i) => (
                  <div key={i}>
                    <span />
                    <div>
                      <strong>{h.label}</strong>
                      <small>{h.date}</small>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "18px" }}>
                <Button variant="secondary" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
