"use client";

import React, { useEffect, useState } from "react";
import { Store, Result } from "@/types/portal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { DataTable } from "@/components/ui/DataTable";
import { getApiJson, mapApiResults, ApiResult } from "@/lib/portalBackend";

interface ResultsPageProps {
  store: Store;
  backendConnected: boolean;
}

export function ResultsPage({ store, backendConnected }: ResultsPageProps) {
  const [electionId, setElectionId] = useState("");
  const [constituencyId, setConstituencyId] = useState("");
  const [rows, setRows] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedElectionId = store.elections.some(
    (election) => election.id === electionId
  )
    ? electionId
    : store.elections[0]?.id ?? "";

  useEffect(() => {
    if (!backendConnected || !selectedElectionId) {
      return;
    }

    const controller = new AbortController();
    const query = constituencyId
      ? `?constituencyId=${encodeURIComponent(constituencyId)}`
      : "";
    const startTimeout = window.setTimeout(() => {
      setLoading(true);
      setError("");
    }, 0);

    void getApiJson<ApiResult[]>(
    `/api/elections/${encodeURIComponent(selectedElectionId)}/results${query}`,
      { signal: controller.signal }
    )
      .then((data) => {
        const electionName =
          store.elections.find((election) => election.id === selectedElectionId)?.name ??
          `Election ${selectedElectionId}`;
        setRows(mapApiResults(data, electionName));
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setRows([]);
          setError(cause instanceof Error ? cause.message : "Unable to load results");
        }
      })
      .finally(() => {
        window.clearTimeout(startTimeout);
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
      window.clearTimeout(startTimeout);
    };
  }, [backendConnected, constituencyId, selectedElectionId, store.elections]);

  const constituencyOptions = store.constituencies;
  const visibleRows = backendConnected && selectedElectionId ? rows : [];

  return (
    <>
      <PageHeader
        title="Results"
        description="Live vote totals from the backend. Results are provisional; the backend has no declaration workflow."
      />

      <div className="result-warning">
        <Icon name="alert" size={18} />
        <span>
          <strong>Provisional vote totals.</strong> These counts are not declared
          final results.
        </span>
      </div>

      {!backendConnected && (
        <div className="empty">Sign in to load backend results.</div>
      )}

      <div className="filters">
        <label className="field compact">
          <span>Election</span>
          <select
            value={selectedElectionId}
            onChange={(event) => {
              setElectionId(event.target.value);
              setConstituencyId("");
            }}
          >
            {store.elections.map((election) => (
              <option key={election.id} value={election.id}>
                {election.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field compact">
          <span>Constituency</span>
          <select
            value={constituencyId}
            onChange={(event) => setConstituencyId(event.target.value)}
          >
            <option value="">All constituencies</option>
            {constituencyOptions.map((constituency) => (
              <option key={constituency.id} value={constituency.id}>
                {constituency.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading results…</p>}
      {!loading && !error && backendConnected && !electionId && (
        <div className="empty">No ongoing election is available in the backend.</div>
      )}

      <DataTable
        rows={visibleRows}
        columns={[
          { key: "rank", label: "Rank" },
          { key: "candidate", label: "Candidate" },
          { key: "party", label: "Political party" },
          { key: "constituency", label: "Constituency" },
          {
            key: "votes",
            label: "Vote total",
            render: (result) => result.votes.toLocaleString("en-IN"),
          },
        ]}
      />
    </>
  );
}
