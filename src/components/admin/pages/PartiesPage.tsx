"use client";

import React from "react";
import { EntityPageProps, Party } from "@/types/portal";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/formatters";
import { getApiJson } from "@/lib/portalBackend";
import { DirectoryConfig, SimpleDirectory } from "./SimpleDirectory";

export function PartiesPage({
  store,
  create,
  update,
  remove,
  notify,
  backendConnected,
}: EntityPageProps) {
  const partyConfig: DirectoryConfig<Party> = {
    title: "Political Parties",
    description:
      "Political parties and symbols from the backend. Recognition metadata is unavailable.",
    key: "parties",
    singular: "Party",
    readOnly: !backendConnected,
    backendNotice: backendConnected
      ? "Party changes are persisted to Supabase."
      : "Backend management is available after admin sign-in.",
    initial: {
      name: "",
      symbol: "",
      founded: "",
    },
    fields: [
      { key: "name", label: "Party name", required: true },
      { key: "symbol", label: "Election symbol", required: true },
      {
        key: "founded",
        label: "Registration date",
        type: "date",
        required: false,
      },
    ],
    detailExtras: (party: Party) => (
      <div className="related">
        <h3>Affiliated candidates</h3>
        {store.candidates
          .filter((c) => c.party === party.name)
          .map((c) => (
            <p key={c.id}>
              {c.name} — {c.constituency} (
              {c.status ? <Badge value={c.status} /> : "Status unavailable"})
            </p>
          ))}
        {!store.candidates.some((c) => c.party === party.name) && (
          <p>No candidates currently affiliated with this party.</p>
        )}
      </div>
    ),
    columns: [
      { key: "id", label: "Party ID" },
      { key: "name", label: "Party name" },
      { key: "symbol", label: "Symbol" },
      {
        key: "founded",
        label: "Registration date",
        render: (r: Party) => formatDate(r.founded),
      },
    ],
    onCreate: async (value) => {
      const row = await getApiJson<{
        party_id: number;
        party_name: string;
        symbol: string | null;
        founded_date: string | null;
      }>("/api/admin/reference/parties", {
        method: "POST",
        body: JSON.stringify({
          name: String(value.name),
          symbol: String(value.symbol ?? ""),
          founded: String(value.founded ?? ""),
        }),
      });
      return {
        id: String(row.party_id),
        name: row.party_name,
        symbol: row.symbol ?? "",
        founded: row.founded_date ?? "",
      };
    },
    onUpdate: async (value, existing) => {
      const row = await getApiJson<{
        party_id: number;
        party_name: string;
        symbol: string | null;
        founded_date: string | null;
      }>(`/api/admin/reference/parties/${encodeURIComponent(existing.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: String(value.name),
          symbol: String(value.symbol ?? ""),
          founded: String(value.founded ?? ""),
        }),
      });
      return {
        id: String(row.party_id),
        name: row.party_name,
        symbol: row.symbol ?? "",
        founded: row.founded_date ?? "",
      };
    },
    onDelete: async (record) => {
      await getApiJson(`/api/admin/reference/parties/${encodeURIComponent(record.id)}`, {
        method: "DELETE",
      });
    },
  };

  return (
    <SimpleDirectory
      config={partyConfig}
      store={store}
      create={create}
      update={update}
      remove={remove}
      notify={notify}
    />
  );
}
