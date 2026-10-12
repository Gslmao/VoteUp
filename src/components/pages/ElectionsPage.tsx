"use client";

import React, { useState } from "react";
import { Election, EntityPageProps, FieldConfig } from "@/types/portal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Filters } from "@/components/ui/Filters";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { EntityForm } from "@/components/forms/EntityForm";
import { Detail } from "@/components/ui/Detail";
import { Confirm } from "@/components/ui/Confirm";
import { formatDate, nextId } from "@/lib/formatters";

export function ElectionsPage({
  store,
  create,
  update,
  remove,
  notify,
  backendConnected,
}: EntityPageProps) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState<Election | "new" | null>(null);
  const [view, setView] = useState<Election | null>(null);
  const [confirm, setConfirm] = useState<{
    row: Election;
    action: "delete" | "advance";
  } | null>(null);

  const rows = store.elections.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) &&
      (!type || e.type === type) &&
      (!status || e.status === status)
  );

  const fields: FieldConfig[] = [
    { key: "name", label: "Election name", required: true },
    {
      key: "type",
      label: "Election type",
      type: "select",
      required: true,
      options: ["General", "State Assembly", "Local Body", "By-election"],
    },
    { key: "start", label: "Start date", type: "date", required: true },
    { key: "end", label: "End date", type: "date", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: ["SCHEDULED", "ONGOING", "COMPLETED"],
    },
  ];

  const save = (value: Record<string, unknown>) => {
    const item = {
      ...value,
      id: form === "new" ? nextId("EL") : (form as Election).id,
    } as Election;

    if (form === "new") {
      create("elections", item as never, "Election created");
    } else {
      update("elections", item as never, "Election updated");
    }
    setForm(null);
  };

  const advance = (row: Election) => {
    const next =
      row.status === "SCHEDULED"
        ? "ONGOING"
        : row.status === "ONGOING"
        ? "COMPLETED"
        : null;

    if (!next) {
      return notify("Completed elections cannot be advanced", "error");
    }

    update(
      "elections",
      { ...row, status: next } as never,
      `Election status changed to ${next}`
    );
    setConfirm(null);
  };

  return (
    <>
      <PageHeader
        title="Elections"
        description={
          backendConnected
            ? "Only ongoing elections are exposed by the backend; election management is not available."
            : "Create, schedule and monitor electoral events."
        }
        action={
          !backendConnected && (
            <Button onClick={() => setForm("new")}>
              <Icon name="plus" size={16} /> Create election
            </Button>
          )
        }
      />

      <Filters search={search} setSearch={setSearch}>
        <select
          aria-label="Election type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">All election types</option>
          {["General", "State Assembly", "Local Body", "By-election"].map(
            (x) => (
              <option key={x} value={x}>
                {x}
              </option>
            )
          )}
        </select>
        <select
          aria-label="Election status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {["SCHEDULED", "ONGOING", "COMPLETED"].map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </Filters>

      <DataTable
        rows={rows}
        columns={[
          { key: "name", label: "Election name" },
          { key: "type", label: "Election type" },
          {
            key: "start",
            label: "Start date",
            render: (r) => formatDate(r.start),
          },
          {
            key: "end",
            label: "End date",
            render: (r) => formatDate(r.end),
          },
          {
            key: "status",
            label: "Status",
            render: (r) => <Badge value={r.status} />,
          },
        ]}
        onView={setView}
        onEdit={!backendConnected ? (r) => setForm(r) : undefined}
        onDelete={!backendConnected ? (r) => setConfirm({ row: r, action: "delete" }) : undefined}
        extraAction={!backendConnected ? (r) =>
          r.status !== "COMPLETED" && (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.closest("details")?.removeAttribute("open");
                setConfirm({ row: r, action: "advance" });
              }}
            >
              Advance status
            </button>
          )
        : undefined}
      />

      {form && (
        <EntityForm
          title={form === "new" ? "Create election" : "Edit election"}
          fields={fields}
          initial={
            form === "new"
              ? {
                  name: "",
                  type: "",
                  start: "",
                  end: "",
                  status: "SCHEDULED",
                }
              : form
          }
          validate={(v): Record<string, string> => {
            const errs: Record<string, string> = {};
            if (String(v.end) < String(v.start)) {
              errs.end = "End date must be on or after the start date";
            }
            return errs;
          }}
          onSave={save}
          onClose={() => setForm(null)}
        />
      )}

      {view && (
        <Detail
          title="Election details"
          record={view}
          onClose={() => setView(null)}
          extras={
            <div className="related">
              <h3>Assigned observers</h3>
              {store.observers
                .filter((o) => o.election === view.name)
                .map((o) => (
                  <p key={o.id}>
                    {o.name} — {o.constituency}
                  </p>
                ))}
              {!store.observers.some((o) => o.election === view.name) && (
                <p>No observers assigned.</p>
              )}
            </div>
          }
        />
      )}

      {confirm && (
        <Confirm
          title={
            confirm.action === "delete"
              ? "Delete election?"
              : "Confirm status transition"
          }
          message={
            confirm.action === "delete"
              ? `Remove ${confirm.row.name}? This only affects local demonstration data.`
              : `Advance ${confirm.row.name} from ${confirm.row.status} to ${
                  confirm.row.status === "SCHEDULED" ? "ONGOING" : "COMPLETED"
                }?`
          }
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.action === "delete") {
              remove("elections", confirm.row.id, "Election deleted");
              setConfirm(null);
            } else {
              advance(confirm.row);
            }
          }}
        />
      )}
    </>
  );
}
