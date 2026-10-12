"use client";

import React, { useState } from "react";
import { EntityPageProps, Nomination, NominationStatus } from "@/types/portal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Filters } from "@/components/ui/Filters";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Detail } from "@/components/ui/Detail";
import { Confirm } from "@/components/ui/Confirm";
import { formatDate } from "@/lib/formatters";
import { getApiJson } from "@/lib/portalBackend";

export function NominationsPage({
  store,
  update,
  notify,
  backendConnected,
}: EntityPageProps) {
  const [search, setSearch] = useState("");
  const [election, setElection] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState<Nomination | null>(null);
  const [change, setChange] = useState<{
    row: Nomination;
    status: NominationStatus;
  } | null>(null);

  const rows = store.nominations.filter(
    (n) =>
      Object.values(n).some((v) =>
        String(v).toLowerCase().includes(search.toLowerCase())
      ) &&
      (!election || n.election === election) &&
      (!status || n.status === status)
  );

  const allowed = (s: NominationStatus): NominationStatus[] =>
    s === "FILED"
      ? ["ACCEPTED", "REJECTED", "WITHDRAWN"]
      : s === "ACCEPTED"
      ? ["WITHDRAWN"]
      : [];

  const apply = async () => {
    if (!change || !allowed(change.row.status).includes(change.status)) {
      return notify("That nomination transition is not permitted", "error");
    }

    if (backendConnected) {
      try {
        await getApiJson<unknown>(
          `/api/admin/nominations/${encodeURIComponent(change.row.id)}`,
          {
            method: "PATCH",
            body: JSON.stringify({ status: change.status }),
          }
        );
      } catch (error) {
        notify(
          error instanceof Error
            ? error.message
            : "Nomination status could not be updated",
          "error"
        );
        return;
      }
    }

    update(
      "nominations",
      { ...change.row, status: change.status } as never,
      `Nomination changed to ${change.status}`
    );

    const candidate = store.candidates.find(
      (c) => c.name === change.row.candidate
    );
    if (candidate) {
      update(
        "candidates",
        { ...candidate, status: change.status } as never,
        "Candidate nomination status synchronized"
      );
    }
    setChange(null);
  };

  return (
    <>
      <PageHeader
        title="Nominations"
        description={
          backendConnected
            ? "Nomination decisions are persisted with database-enforced status transitions."
            : "Review nomination filings and record decisions."
        }
      />

      <Filters search={search} setSearch={setSearch}>
        <select
          aria-label="Filter by election"
          value={election}
          onChange={(e) => setElection(e.target.value)}
        >
          <option value="">All elections</option>
          {store.elections.map((e) => (
            <option key={e.id} value={e.name}>
              {e.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {["FILED", "ACCEPTED", "REJECTED", "WITHDRAWN"].map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </Filters>

      <DataTable
        rows={rows}
        columns={[
          { key: "id", label: "Nomination ID" },
          { key: "candidate", label: "Candidate" },
          { key: "election", label: "Election" },
          { key: "constituency", label: "Constituency" },
          {
            key: "filed",
            label: "Filing date",
            render: (r) => formatDate(r.filed),
          },
          {
            key: "status",
            label: "Status",
            render: (r) => <Badge value={r.status} />,
          },
        ]}
        onView={setView}
        extraAction={(r) =>
          allowed(r.status).map((s) => (
            <button
              key={s}
              type="button"
              onClick={(e) => {
                e.currentTarget.closest("details")?.removeAttribute("open");
                setChange({ row: r, status: s });
              }}
            >
              Mark as {s.toLowerCase()}
            </button>
          ))
        }
      />

      {view && (
        <Detail
          title="Nomination details"
          record={view}
          onClose={() => setView(null)}
        />
      )}

      {change && (
        <Confirm
          title="Confirm nomination decision"
          message={`Change ${change.row.id} from ${change.row.status} to ${change.status}?`}
          onClose={() => setChange(null)}
          onConfirm={() => void apply()}
        />
      )}
    </>
  );
}
