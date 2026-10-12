"use client";

import React from "react";
import { Candidate, EntityPageProps } from "@/types/portal";
import { Badge } from "@/components/ui/Badge";
import { formatDate, money } from "@/lib/formatters";
import { DirectoryConfig, SimpleDirectory } from "./SimpleDirectory";

export function CandidatesPage({
  store,
  create,
  update,
  remove,
}: EntityPageProps) {
  const partyOptions = Array.from(
    new Set([...store.candidates.map((c) => c.party), "Independent"])
  );
  const constituencyOptions = store.constituencies.map((c) => c.name);

  const candidateConfig: DirectoryConfig<Candidate> = {
    title: "Candidates",
    description:
      "Register candidates separately from nomination review and approval.",
    key: "candidates",
    singular: "Candidate",
    filterKey: "party",
    filterOptions: partyOptions,
    secondFilterKey: "constituency",
    secondFilterOptions: constituencyOptions,
    initial: {
      name: "",
      dob: "",
      party: "",
      constituency: "",
      assets: 0,
      status: "FILED",
    },
    fields: [
      { key: "name", label: "Full name", required: true },
      { key: "dob", label: "Date of birth", type: "date", required: true },
      { key: "party", label: "Political party", required: true },
      {
        key: "constituency",
        label: "Constituency",
        type: "select",
        required: true,
        options: constituencyOptions,
      },
      {
        key: "assets",
        label: "Declared assets (INR)",
        type: "number",
        required: true,
      },
    ],
    detailExtras: (candidate: Candidate) => (
      <div className="related">
        <h3>Nomination filings</h3>
        {store.nominations
          .filter((n) => n.candidate === candidate.name)
          .map((n) => (
            <p key={n.id}>
              {n.id} — {n.election} — <Badge value={n.status} />
            </p>
          ))}
        {!store.nominations.some((n) => n.candidate === candidate.name) && (
          <p>No nomination filing is linked to this candidate.</p>
        )}
      </div>
    ),
    columns: [
      { key: "id", label: "Candidate ID" },
      { key: "name", label: "Full name" },
      {
        key: "dob",
        label: "Date of birth",
        render: (r: Candidate) => formatDate(r.dob),
      },
      { key: "party", label: "Political party" },
      { key: "constituency", label: "Constituency" },
      {
        key: "assets",
        label: "Declared assets",
        render: (r: Candidate) => money(r.assets),
      },
      {
        key: "status",
        label: "Nomination",
        render: (r: Candidate) => <Badge value={r.status} />,
      },
    ],
  };

  return (
    <SimpleDirectory
      config={candidateConfig}
      store={store}
      create={create}
      update={update}
      remove={remove}
    />
  );
}
