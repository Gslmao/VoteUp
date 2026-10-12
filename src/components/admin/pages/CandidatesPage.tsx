"use client";

import React from "react";
import { Candidate, EntityPageProps } from "@/types/portal";
import { Badge } from "@/components/ui/Badge";
import { formatDate, money } from "@/lib/formatters";
import { DirectoryConfig, SimpleDirectory } from "./SimpleDirectory";
import { getApiJson } from "@/lib/portalBackend";

export function CandidatesPage({
  store,
  create,
  update,
  remove,
  notify,
  backendConnected,
}: EntityPageProps) {
  const partyOptions = Array.from(
    new Set([
      ...(store.parties?.map((p) => p.name) ?? []),
      ...store.candidates.map((c) => c.party),
      "Independent",
    ])
  );
  const constituencyOptions = store.constituencies.map((c) => c.name);
  const electionOptions = store.elections.map((e) => e.name);

  const candidateConfig: DirectoryConfig<Candidate> = {
    title: "Candidates",
    description: "Candidate records and nomination decisions from the backend.",
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
      election: electionOptions[0] ?? "",
      assets: 0,
      status: "FILED",
    },
    fields: [
      { key: "name", label: "Full name", required: true },
      { key: "dob", label: "Date of birth", type: "date", required: true },
      {
        key: "party",
        label: "Political party",
        type: "select",
        required: false,
        options: partyOptions,
      },
      {
        key: "constituency",
        label: "Constituency",
        type: "select",
        required: true,
        options: constituencyOptions,
      },
      {
        key: "election",
        label: "Election",
        type: "select",
        required: true,
        options: electionOptions,
      },
      {
        key: "assets",
        label: "Declared assets (INR)",
        type: "number",
        required: true,
      },
    ],
    editFields: [
      { key: "name", label: "Full name", required: true },
      { key: "dob", label: "Date of birth", type: "date", required: true },
      {
        key: "party",
        label: "Political party",
        type: "select",
        options: partyOptions,
      },
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
    createOnly: !backendConnected,
    backendNotice: backendConnected
      ? "Create, edit and delete are persisted; candidates with recorded votes cannot be changed or deleted."
      : undefined,
    onCreate: async (value) => {
      const constituency = store.constituencies.find(
        (item) => item.name === value.constituency
      );
      const election = store.elections.find((item) => item.name === value.election);
      const party = store.parties.find((item) => item.name === value.party);
      if (!constituency || !election) {
        throw new Error("Select a valid constituency and ongoing election.");
      }
      const body = await getApiJson<{ candidate: { candidate_id: number } }>(
        "/api/candidates",
        {
        method: "POST",
        body: JSON.stringify({
          fullName: value.name,
          dob: value.dob,
          partyId: party ? Number(party.id) : null,
          constituencyId: Number(constituency.id),
          electionId: Number(election.id),
          assetsDeclaredInr: Number(value.assets),
        }),
        }
      );
      return {
        id: String(body.candidate.candidate_id),
        name: String(value.name),
        dob: String(value.dob),
        party: party?.name ?? "Independent",
        constituency: constituency.name,
        assets: Number(value.assets),
        status: "FILED",
      } as Candidate;
    },
    onUpdate: async (value, existing) => {
      const constituency = store.constituencies.find(
        (item) => item.name === value.constituency
      );
      const party = store.parties.find((item) => item.name === value.party);
      if (!constituency) throw new Error("Select a valid constituency.");
      await getApiJson<{ candidate: unknown }>(
        `/api/admin/candidates/${encodeURIComponent(existing.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            fullName: value.name,
            dob: value.dob,
            partyId: party ? Number(party.id) : null,
            constituencyId: Number(constituency.id),
            assetsDeclaredInr: Number(value.assets),
          }),
        }
      );
      return {
        ...existing,
        name: String(value.name),
        dob: String(value.dob),
        party: party?.name ?? "Independent",
        constituency: constituency.name,
        assets: Number(value.assets),
      };
    },
    onDelete: async (candidate) => {
      await getApiJson<{ success: boolean }>(
        `/api/admin/candidates/${encodeURIComponent(candidate.id)}`,
        { method: "DELETE" }
      );
    },
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
        render: (r: Candidate) =>
          r.status ? <Badge value={r.status} /> : "Unavailable",
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
      notify={notify}
    />
  );
}
