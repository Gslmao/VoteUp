"use client";

import React from "react";
import { Constituency, EntityPageProps } from "@/types/portal";
import { states } from "@/data/mockData";
import { DirectoryConfig, SimpleDirectory } from "./SimpleDirectory";

export function ConstituenciesPage({
  store,
  create,
  update,
  remove,
}: EntityPageProps) {
  const constituencyConfig: DirectoryConfig<Constituency> = {
    title: "Constituencies",
    description: "Maintain constituency boundaries and registered voter totals.",
    key: "constituencies",
    singular: "Constituency",
    filterKey: "state",
    filterOptions: states,
    initial: { name: "", state: "", voters: 0 },
    fields: [
      { key: "name", label: "Name", required: true },
      {
        key: "state",
        label: "State",
        type: "select",
        required: true,
        options: states,
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
    />
  );
}
