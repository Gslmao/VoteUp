"use client";

import React, { useState } from "react";
import { EntityPageProps, FieldConfig, Voter } from "@/types/portal";
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

export function VotersPage({
  store,
  voters,
  setVoters,
  addAudit,
  notify,
}: EntityPageProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState<Voter | "new" | null>(null);
  const [view, setView] = useState<Voter | null>(null);
  const [deleting, setDeleting] = useState<Voter | null>(null);

  const rows = voters.filter(
    (v) =>
      Object.values(v).some((x) =>
        String(x).toLowerCase().includes(search.toLowerCase())
      ) &&
      (!filter || v.constituency === filter)
  );

  const fields: FieldConfig[] = [
    { key: "epic", label: "EPIC number", required: true },
    { key: "name", label: "Full name", required: true },
    {
      key: "constituency",
      label: "Constituency",
      type: "select",
      required: true,
      options: store.constituencies.map((c) => c.name),
    },
    { key: "dob", label: "Date of birth", type: "date", required: true },
    {
      key: "participation",
      label: "Demonstration participation status",
      type: "select",
      required: true,
      options: ["Recorded", "Not recorded"],
    },
  ];

  const save = (value: Record<string, unknown>) => {
    const item = {
      ...value,
      id: form === "new" ? nextId("VTR") : (form as Voter).id,
    } as Voter;

    setVoters((v) =>
      form === "new" ? [item, ...v] : v.map((x) => (x.id === item.id ? item : x))
    );
    addAudit(
      "Voter",
      form === "new" ? "CREATE" : "UPDATE",
      item.id,
      "Non-sensitive voter directory record changed"
    );
    notify(`Voter ${form === "new" ? "registered" : "updated"}`);
    setForm(null);
  };

  return (
    <>
      <PageHeader
        title="Voters"
        description="Manage voter directory records. Ballot choices are never stored or displayed."
        action={
          <Button onClick={() => setForm("new")}>
            <Icon name="plus" size={16} /> Register voter
          </Button>
        }
      />

      <div className="privacy-note">
        <Icon name="info" size={17} />
        <span>
          <strong>Privacy notice:</strong> voter records are held in memory for
          this session only and are not saved to localStorage. Participation
          status does not indicate a ballot choice.
        </span>
      </div>

      <Filters search={search} setSearch={setSearch}>
        <select
          aria-label="Filter by constituency"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
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
          { key: "id", label: "Voter ID" },
          { key: "epic", label: "EPIC number" },
          { key: "name", label: "Full name" },
          { key: "constituency", label: "Constituency" },
          {
            key: "dob",
            label: "Date of birth",
            render: (r) => formatDate(r.dob),
          },
          {
            key: "participation",
            label: "Participation",
            render: (r) => <Badge value={r.participation} />,
          },
        ]}
        onView={setView}
        onEdit={(r) => setForm(r)}
        onDelete={(r) => setDeleting(r)}
      />

      {form && (
        <EntityForm
          title={form === "new" ? "Register voter" : "Edit voter"}
          fields={fields}
          initial={
            form === "new"
              ? {
                  epic: "",
                  name: "",
                  constituency: "",
                  dob: "",
                  participation: "Not recorded",
                }
              : form
          }
          onSave={save}
          onClose={() => setForm(null)}
        />
      )}

      {view && (
        <Detail
          title="Voter details"
          record={view}
          onClose={() => setView(null)}
        />
      )}

      {deleting && (
        <Confirm
          title="Remove voter record?"
          message={`Remove the local record for ${deleting.name}?`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            setVoters((v) => v.filter((x) => x.id !== deleting.id));
            addAudit(
              "Voter",
              "DELETE",
              deleting.id,
              "Voter directory record removed"
            );
            notify("Voter record removed");
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}
