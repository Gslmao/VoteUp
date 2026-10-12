"use client";

import React from "react";
import { EntityPageProps, Observer } from "@/types/portal";
import { DirectoryConfig, SimpleDirectory } from "./SimpleDirectory";

export function ObserversPage({
  store,
  create,
  update,
  remove,
  notify,
}: EntityPageProps) {
  const electionOptions = store.elections.map((e) => e.name);
  const constituencyOptions = store.constituencies.map((c) => c.name);

  const observerConfig: DirectoryConfig<Observer> = {
    title: "Observers",
    description: "Manage observer profiles and election assignments.",
    backendNotice: "Observer data is local demonstration data; no backend API exists.",
    key: "observers",
    singular: "Observer",
    filterKey: "election",
    filterOptions: electionOptions,
    initial: { name: "", constituency: "", election: "" },
    fields: [
      { key: "name", label: "Full name", required: true },
      {
        key: "constituency",
        label: "Assigned constituency",
        type: "select",
        required: true,
        options: constituencyOptions,
      },
      {
        key: "election",
        label: "Assigned election",
        type: "select",
        required: true,
        options: electionOptions,
      },
    ],
    columns: [
      { key: "id", label: "Observer ID" },
      { key: "name", label: "Full name" },
      { key: "constituency", label: "Assigned constituency" },
      { key: "election", label: "Assigned election" },
    ],
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
