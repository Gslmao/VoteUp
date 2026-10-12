"use client";

import React from "react";
import { EntityPageProps, Party } from "@/types/portal";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/formatters";
import { DirectoryConfig, SimpleDirectory } from "./SimpleDirectory";

export function PartiesPage({
  store,
  create,
  update,
  remove,
  notify,
}: EntityPageProps) {
  const recognitionOptions = [
    "National",
    "State",
    "Registered (Unrecognised)",
  ];

  const partyConfig: DirectoryConfig<Party> = {
    title: "Political Parties",
    description:
      "Political parties and symbols from the backend. Recognition metadata is unavailable.",
    key: "parties",
    singular: "Party",
    readOnly: true,
    backendNotice: "Management is read-only because no party write API exists.",
    initial: {
      name: "",
      symbol: "",
      founded: "",
      type: "National",
    },
    fields: [
      { key: "name", label: "Party name", required: true },
      { key: "symbol", label: "Election symbol", required: true },
      {
        key: "founded",
        label: "Registration date",
        type: "date",
        required: true,
      },
      {
        key: "type",
        label: "Recognition status",
        type: "select",
        required: true,
        options: recognitionOptions,
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
      {
        key: "type",
        label: "Status",
        render: (r: Party) =>
          r.type ? <Badge value={r.type} /> : "Unavailable",
      },
    ],
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
