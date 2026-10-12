"use client";

import React from "react";
import { EntityPageProps, Observer } from "@/types/portal";
import { getApiJson } from "@/lib/portalBackend";
import { DirectoryConfig, SimpleDirectory } from "./SimpleDirectory";

export function ObserversPage({
  store,
  create,
  update,
  remove,
  notify,
  backendConnected,
}: EntityPageProps) {
  const electionOptions = store.elections.map((e) => e.name);
  const electionSelections = store.elections.map((e) => ({
    label: e.name,
    value: e.id,
  }));
  const constituencySelections = store.constituencies.map((c) => ({
    label: `${c.name} (${c.state})`,
    value: c.id,
  }));

  const observerConfig: DirectoryConfig<Observer> = {
    title: "Observers",
    description: "Manage observer profiles and election assignments.",
    backendNotice: backendConnected
      ? "Observer assignments are persisted to Supabase."
      : "Backend management is available after admin sign-in.",
    key: "observers",
    singular: "Observer",
    readOnly: !backendConnected,
    filterKey: "election",
    filterOptions: electionOptions,
    initial: {
      name: "",
      constituencyId: store.constituencies[0]?.id ?? "",
      electionId: store.elections[0]?.id ?? "",
    },
    fields: [
      { key: "name", label: "Full name", required: true },
      {
        key: "constituencyId",
        label: "Assigned constituency",
        type: "select",
        required: true,
        options: constituencySelections,
      },
      {
        key: "electionId",
        label: "Assigned election",
        type: "select",
        required: true,
        options: electionSelections,
      },
    ],
    columns: [
      { key: "id", label: "Observer ID" },
      { key: "name", label: "Full name" },
      { key: "constituency", label: "Assigned constituency" },
      { key: "election", label: "Assigned election" },
    ],
    onCreate: async (value) => {
      const row = await getApiJson<{
        observer_id: number;
        full_name: string;
        constituency_id: number;
        election_id: number;
      }>("/api/admin/reference/observers", {
        method: "POST",
        body: JSON.stringify({
          name: String(value.name),
          constituencyId: Number(value.constituencyId),
          electionId: Number(value.electionId),
        }),
      });
      return {
        id: String(row.observer_id),
        name: row.full_name,
        constituencyId: row.constituency_id,
        constituency: store.constituencies.find((c) => c.id === String(row.constituency_id))?.name ?? "Unassigned",
        electionId: row.election_id,
        election: store.elections.find((e) => e.id === String(row.election_id))?.name ?? "Unassigned",
      };
    },
    onUpdate: async (value, existing) => {
      const row = await getApiJson<{
        observer_id: number;
        full_name: string;
        constituency_id: number;
        election_id: number;
      }>(`/api/admin/reference/observers/${encodeURIComponent(existing.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: String(value.name),
          constituencyId: Number(value.constituencyId),
          electionId: Number(value.electionId),
        }),
      });
      return {
        id: String(row.observer_id),
        name: row.full_name,
        constituencyId: row.constituency_id,
        constituency: store.constituencies.find((c) => c.id === String(row.constituency_id))?.name ?? "Unassigned",
        electionId: row.election_id,
        election: store.elections.find((e) => e.id === String(row.election_id))?.name ?? "Unassigned",
      };
    },
    onDelete: async (record) => {
      await getApiJson(
        `/api/admin/reference/observers/${encodeURIComponent(record.id)}`,
        { method: "DELETE" }
      );
    },
  };

  return (
    <SimpleDirectory
      config={observerConfig}
      store={store}
      create={create}
      update={update}
      remove={remove}
      notify={notify}
    />
  );
}
