"use client";

import React from "react";
import { Constituency, EntityPageProps } from "@/types/portal";
import { DirectoryConfig, SimpleDirectory } from "./SimpleDirectory";

export function ConstituenciesPage({
  store,
  create,
  update,
  remove,
  notify,
}: EntityPageProps) {
  const stateOptions = Array.from(new Set(store.constituencies.map((c) => c.state)));
  const constituencyConfig: DirectoryConfig<Constituency> = {
    title: "Constituencies",
    description: "Constituencies and registered voter totals from the backend.",
    key: "constituencies",
    singular: "Constituency",
    filterKey: "state",
    filterOptions: stateOptions,
    readOnly: true,
    backendNotice: "Management is read-only because no constituency write API exists.",
    initial: { name: "", state: "", voters: 0 },
    fields: [
      { key: "name", label: "Name", required: true },
      {
        key: "state",
        label: "State",
        type: "select",
        required: true,
        options: stateOptions,
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
