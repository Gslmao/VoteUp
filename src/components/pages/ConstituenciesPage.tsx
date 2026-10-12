"use client";

import React, { useEffect, useState } from "react";
import { Constituency, EntityPageProps } from "@/types/portal";
import { getApiJson } from "@/lib/portalBackend";
import { DirectoryConfig, SimpleDirectory } from "./SimpleDirectory";

export function ConstituenciesPage({
  store,
  create,
  update,
  remove,
  notify,
  backendConnected,
}: EntityPageProps) {
  const [states, setStates] = useState<{ state_id: number; state_name: string }[]>([]);
  useEffect(() => {
    if (!backendConnected) return;
    void getApiJson<typeof states>("/api/admin/reference/states")
      .then(setStates)
      .catch((error: unknown) => {
        notify(
          error instanceof Error ? error.message : "States could not be loaded",
          "error"
        );
      });
  }, [backendConnected, notify]);

  const stateOptions = Array.from(new Set(store.constituencies.map((c) => c.state)));
  const constituencyConfig: DirectoryConfig<Constituency> = {
    title: "Constituencies",
    description: "Constituencies and registered voter totals from the backend.",
    key: "constituencies",
    singular: "Constituency",
    filterKey: "state",
    filterOptions: stateOptions,
    readOnly: !backendConnected,
    backendNotice: backendConnected
      ? "Constituency changes are persisted to Supabase."
      : "Backend management is available after admin sign-in.",
    initial: { name: "", stateId: String(states[0]?.state_id ?? ""), voters: 0 },
    fields: [
      { key: "name", label: "Name", required: true },
      {
        key: "stateId",
        label: "State",
        type: "select",
        required: true,
        options: states.map((state) => ({
          label: state.state_name,
          value: String(state.state_id),
        })),
      },
      {
        key: "voters",
        label: "Registered voter count",
        type: "number",
        required: true,
      },
    ],
    columns: [
      { key: "id", label: "Constituency ID" },
      { key: "name", label: "Name" },
      { key: "state", label: "State" },
      {
        key: "voters",
        label: "Registered voters",
        render: (r: Constituency) => r.voters.toLocaleString("en-IN"),
      },
    ],
    onCreate: async (value) => {
      const stateId = Number(value.stateId);
      const row = await getApiJson<{
        constituency_id: number;
        name: string;
        state_id: number;
        total_registered_voters: number | null;
      }>("/api/admin/reference/constituencies", {
        method: "POST",
        body: JSON.stringify({
          name: String(value.name),
          stateId,
          voters: Number(value.voters),
        }),
      });
      return {
        id: String(row.constituency_id),
        name: row.name,
        state: states.find((state) => state.state_id === row.state_id)?.state_name ?? "Unknown",
        stateId: row.state_id,
        voters: row.total_registered_voters ?? 0,
      };
    },
    onUpdate: async (value, existing) => {
      const row = await getApiJson<{
        constituency_id: number;
        name: string;
        state_id: number;
        total_registered_voters: number | null;
      }>(`/api/admin/reference/constituencies/${encodeURIComponent(existing.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: String(value.name),
          stateId: Number(value.stateId),
          voters: Number(value.voters),
        }),
      });
      return {
        id: String(row.constituency_id),
        name: row.name,
        state: states.find((state) => state.state_id === row.state_id)?.state_name ?? "Unknown",
        stateId: row.state_id,
        voters: row.total_registered_voters ?? 0,
      };
    },
    onDelete: async (record) => {
      await getApiJson(
        `/api/admin/reference/constituencies/${encodeURIComponent(record.id)}`,
        { method: "DELETE" }
      );
    },
  };

  return (
    <SimpleDirectory
      config={constituencyConfig}
      store={store}
      create={create}
      update={update}
      remove={remove}
      notify={notify}
    />
  );
}
