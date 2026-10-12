"use client";

import React, { useEffect, useState } from "react";
import { CandidateRecord, VoterPageKey } from "@/types/voter";
import { getApiJson } from "@/lib/portalBackend";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Field } from "@/components/voters/common/Field";
import { PageHeading } from "@/components/voters/common/PageHeading";
import { EmptyState } from "@/components/voters/common/EmptyState";

interface CandidatesPageProps {
  navigate: (p: VoterPageKey) => void;
}

export function CandidatesPage({ navigate }: CandidatesPageProps) {
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [parties, setParties] = useState<{ id: string; name: string; symbol: string }[]>([]);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [party, setParty] = useState("All");
  const [constituency, setConstituency] = useState("All");
  const [sort, setSort] = useState("Name A–Z");
  const [selected, setSelected] = useState<CandidateRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [candidateRows, partyRows, constituencyRows] = await Promise.all([
          getApiJson<{
            candidate_id: number;
            full_name: string;
            dob: string;
            party_id: number | null;
            party_name: string | null;
            constituency_id: number;
          }[]>("/api/voter/candidates"),
          getApiJson<{ party_id: number; party_name: string; symbol: string | null }[]>("/api/parties"),
          getApiJson<{ constituency_id: number; name: string }[]>("/api/constituencies"),
        ]);
        if (cancelled) return;

        const constituencyNames = new Map(
          constituencyRows.map((row) => [row.constituency_id, row.name])
        );
        const mappedParties = partyRows.map((row) => ({
          id: String(row.party_id),
          name: row.party_name,
          symbol: row.symbol ?? "•",
        }));
        setParties(mappedParties);
        setCandidates(candidateRows.map((row) => {
          const age = calculateAge(row.dob);
          return {
            id: String(row.candidate_id),
            name: row.full_name,
            partyId: String(row.party_id ?? ""),
            constituency: constituencyNames.get(row.constituency_id) ?? "Unknown constituency",
            profile: "Candidate with an accepted nomination.",
            age,
            profession: "Not provided",
            nomination: "Accepted" as const,
            electionId: "",
          };
        }));
        setLoadError("");
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Unable to load candidates.");
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const visible = candidates
    .filter(
      (c) =>
        c.nomination === "Accepted" &&
        c.name.toLowerCase().includes(search.toLowerCase()) &&
        (party === "All" || c.partyId === party) &&
        (constituency === "All" || c.constituency === constituency)
    )
    .sort((a, b) =>
      sort === "Name Z–A"
        ? b.name.localeCompare(a.name)
        : a.name.localeCompare(b.name)
    );

  const partyFor = (id: string) => parties.find((p) => p.id === id) ?? {
    id,
    name: "Independent",
    symbol: "•",
  };

  return (
    <main id="main-content" className="app-main">
      <div className="shell">
        <PageHeading
          eyebrow="Public candidate directory"
          title="Candidate information"
          description="Browse candidates with accepted nominations in the connected election registry."
        />

        <div className="filter-bar candidate-filters">
          <div className="search-box">
            <Icon name="search" size={18} />
            <input
              aria-label="Search candidates"
              placeholder="Search by candidate name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Field label="Party">
            <select value={party} onChange={(e) => setParty(e.target.value)}>
              <option>All</option>
              {parties.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Constituency">
            <select
              value={constituency}
              onChange={(e) => setConstituency(e.target.value)}
            >
              <option>All</option>
              {[...new Set(candidates.map((c) => c.constituency))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Sort by">
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option>Name A–Z</option>
              <option>Name Z–A</option>
            </select>
          </Field>
        </div>

        <div className="results-meta">
          <span>
            {visible.length} accepted candidate{visible.length !== 1 ? "s" : ""}
          </span>
          <small>Candidate records are shown as stored in the connected database</small>
        </div>

        {loadError && <div className="form-alert" role="alert">{loadError}</div>}

        <div className="candidate-grid">
          {visible.map((c) => {
            const p = partyFor(c.partyId);
            return (
              <article className="candidate-card" key={c.id}>
                <div className="candidate-head">
                  <span className="candidate-avatar">
                    {c.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                  <div>
                    <h2>{c.name}</h2>
                    <p>{p.name}</p>
                  </div>
                  <span className="symbol" title={`Party symbol: ${p.symbol}`}>
                    {p.symbol.slice(0, 1)}
                  </span>
                </div>
                <div className="candidate-meta">
                  <span>
                    <Icon name="location" size={15} /> {c.constituency}
                  </span>
                  <span>
                    <Icon name="check" size={15} /> Nomination accepted
                  </span>
                </div>
                <p>{c.profile}</p>
                <button
                  className="candidate-more"
                  onClick={() => setSelected(c)}
                >
                  View candidate details <Icon name="arrow" size={16} />
                </button>
              </article>
            );
          })}
        </div>

        {!visible.length && (
          <EmptyState
            icon="users"
            title="No candidates found"
            text="Adjust your search or filters to view more candidates."
          />
        )}

        {selected && (
          <div
            className="modal-backdrop"
            onMouseDown={() => setSelected(null)}
          >
            <div
              className="modal candidate-modal"
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={() => setSelected(null)}
                aria-label="Close modal"
              >
                <Icon name="close" />
              </button>
              <div className="candidate-head">
                <span className="candidate-avatar large">
                  {selected.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
                <div>
                  <span className="eyebrow">Candidate profile</span>
                  <h2>{selected.name}</h2>
                  <p>{partyFor(selected.partyId).name}</p>
                </div>
              </div>
              <p>{selected.profile}</p>
              <div className="modal-facts">
                <div>
                  <small>Constituency</small>
                  <strong>{selected.constituency}</strong>
                </div>
                <div>
                  <small>Age</small>
                  <strong>{selected.age}</strong>
                </div>
                <div>
                  <small>Profession</small>
                  <strong>{selected.profession}</strong>
                </div>
                <div>
                  <small>Nomination</small>
                  <strong>Accepted</strong>
                </div>
              </div>
              <div className="instruction-box">
                <strong>Candidate information</strong>
                <p>
                  Additional candidate disclosures are not available in the current registry.
                </p>
              </div>
              <div style={{ marginTop: "18px" }}>
                <Button variant="secondary" onClick={() => setSelected(null)}>
                  Close profile
                </Button>
                <Button onClick={() => navigate("vote")}>Open voting</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function calculateAge(dob: string) {
  const birthDate = new Date(`${dob.slice(0, 10)}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  if (
    now.getMonth() < birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate())
  ) age -= 1;
  return age;
}
