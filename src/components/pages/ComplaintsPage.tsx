"use client";

import React, { useState } from "react";
import { Complaint, ComplaintStatus, EntityPageProps } from "@/types/portal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Filters } from "@/components/ui/Filters";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Detail } from "@/components/ui/Detail";
import { Confirm } from "@/components/ui/Confirm";
import { formatDate } from "@/lib/formatters";

export function ComplaintsPage({ store, update }: EntityPageProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [constituency, setConstituency] = useState("");
  const [view, setView] = useState<Complaint | null>(null);
  const [change, setChange] = useState<{
    row: Complaint;
    status: ComplaintStatus;
  } | null>(null);

  const rows = store.complaints.filter(
    (c) =>
      Object.values(c).some((v) =>
        String(v).toLowerCase().includes(search.toLowerCase())
      ) &&
      (!status || c.status === status) &&
      (!constituency || c.constituency === constituency)
  );

  return (
    <>
      <PageHeader
        title="Complaints"
        description="Track, investigate and resolve election-related complaints."
      />

      <Filters search={search} setSearch={setSearch}>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"].map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by constituency"
          value={constituency}
          onChange={(e) => setConstituency(e.target.value)}
        >
          <option value="">All constituencies</option>
          {store.constituencies.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </Filters>

      <DataTable
        rows={rows}
        columns={[
          { key: "id", label: "Complaint ID" },
          {
            key: "filed",
            label: "Filed date",
            render: (r) => formatDate(r.filed),
          },
          { key: "constituency", label: "Constituency" },
          { key: "election", label: "Election" },
          {
            key: "description",
            label: "Description",
            render: (r) => <span className="truncate">{r.description}</span>,
          },
          {
            key: "status",
            label: "Status",
            render: (r) => <Badge value={r.status} />,
          },
        ]}
        onView={setView}
        extraAction={(r) =>
          ["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"]
            .filter((s) => s !== r.status)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={(e) => {
                  e.currentTarget.closest("details")?.removeAttribute("open");
                  setChange({ row: r, status: s as ComplaintStatus });
                }}
              >
                Mark {s.toLowerCase()}
              </button>
            ))
        }
      />

      {view && (
        <Detail
          title="Complaint details"
          record={view}
          onClose={() => setView(null)}
        />
      )}

      {change && (
        <Confirm
          title="Confirm complaint status"
          message={`Change ${change.row.id} from ${change.row.status} to ${change.status}?`}
          onClose={() => setChange(null)}
          onConfirm={() => {
            update(
              "complaints",
              { ...change.row, status: change.status } as never,
              `Complaint changed to ${change.status}`
            );
            setChange(null);
          }}
        />
      )}
    </>
  );
}
