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
import {
  ApiElection,
  getApiJson,
  mapApiElection,
  mapApiElections,
} from "@/lib/portalBackend";

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
      options: backendConnected
        ? ["General", "State Assembly", "By-election"]
        : ["General", "State Assembly", "Local Body", "By-election"],
    },
    { key: "start", label: "Start date", type: "date", required: true },
    { key: "end", label: "End date", type: "date", required: true },
    ...(!backendConnected
      ? [{
          key: "status",
          label: "Status",
          type: "select" as const,
          required: true,
          options: ["SCHEDULED", "ONGOING", "COMPLETED"],
        }]
      : []),
  ];

  const save = async (value: Record<string, unknown>) => {
    if (backendConnected) {
      const typeToDb: Record<string, string> = {
        General: "GENERAL",
        "By-election": "BY_ELECTION",
        "State Assembly": "STATE",
      };
      const payload = {
        electionName: String(value.name),
        electionType: typeToDb[String(value.type)],
        startDate: String(value.start),
        endDate: String(value.end),
      };
      try {
        const wasNew = form === "new";
        const url = wasNew
          ? "/api/admin/elections"
          : `/api/admin/elections/${encodeURIComponent((form as Election).id)}`;
        await getApiJson<ApiElection>(url, {
          method: wasNew ? "POST" : "PATCH",
          body: JSON.stringify(payload),
        });
        const records = await getApiJson<ApiElection[]>("/api/admin/elections");
        const elections = mapApiElections(records);
        elections.forEach((election) => {
          if (store.elections.some((existing) => existing.id === election.id)) {
            update("elections", election as never, "Election updated");
          } else {
            create("elections", election as never, "Election created");
          }
        });
        setForm(null);
        notify(wasNew ? "Election created" : "Election updated");
      } catch (error) {
        notify(
          error instanceof Error ? error.message : "Election could not be saved",
          "error"
        );
      }
      return;
    }

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

  const advance = async (row: Election) => {
    const next =
      row.status === "SCHEDULED"
        ? "ONGOING"
        : row.status === "ONGOING"
        ? "COMPLETED"
        : null;

    if (!next) {
      return notify("Completed elections cannot be advanced", "error");
    }

    if (backendConnected) {
      try {
        const changed = await getApiJson<ApiElection>(
          `/api/admin/elections/${encodeURIComponent(row.id)}`,
          { method: "PATCH", body: JSON.stringify({ status: next }) }
        );
        update("elections", mapApiElection(changed) as never, `Election status changed to ${next}`);
        setConfirm(null);
      } catch (error) {
        notify(error instanceof Error ? error.message : "Election status could not be changed", "error");
      }
    } else {
      update(
        "elections",
        { ...row, status: next } as never,
        `Election status changed to ${next}`
      );
      setConfirm(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Elections"
        description={
          backendConnected
            ? "Elections are stored in Supabase; only scheduled elections can be edited."
            : "Create, schedule and monitor electoral events."
        }
        action={
          <Button onClick={() => setForm("new")}>
            <Icon name="plus" size={16} /> Create election
          </Button>
        }
      />

      <Filters search={search} setSearch={setSearch}>
        <select
          aria-label="Election type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">All election types</option>
          {(backendConnected
            ? ["General", "State Assembly", "By-election"]
            : ["General", "State Assembly", "Local Body", "By-election"]).map(
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
        onEdit={(r) => setForm(r)}
        onDelete={(r) => setConfirm({ row: r, action: "delete" })}
        extraAction={(r) =>
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
        }
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
          onSave={(value) => void save(value)}
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
              if (backendConnected) {
                void getApiJson<{ success: boolean }>(
                  `/api/admin/elections/${encodeURIComponent(confirm.row.id)}`,
                  { method: "DELETE" }
                ).then(() => {
                  remove("elections", confirm.row.id, "Election deleted");
                  setConfirm(null);
                  notify("Election deleted");
                }).catch((error: unknown) => {
                  notify(error instanceof Error ? error.message : "Election could not be deleted", "error");
                });
              } else {
                remove("elections", confirm.row.id, "Election deleted");
                setConfirm(null);
              }
            } else {
              void advance(confirm.row);
            }
          }}
        />
      )}
    </>
  );
}
