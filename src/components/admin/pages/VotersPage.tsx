"use client";

import React, { useEffect, useState } from "react";
import { EntityPageProps, FieldConfig, Voter } from "@/types/portal";
import { Filters } from "@/components/ui/Filters";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { EntityForm } from "@/components/forms/EntityForm";
import { Detail } from "@/components/ui/Detail";
import { Confirm } from "@/components/ui/Confirm";
import { formatDate, nextId } from "@/lib/formatters";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiVoter, getApiJson, mapApiVoters } from "@/lib/portalBackend";

export function VotersPage({
  store,
  voters,
  setVoters,
  addAudit,
  notify,
  backendConnected,
}: EntityPageProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [electionId, setElectionId] = useState(store.elections[0]?.id ?? "");
  const [loadedElectionId, setLoadedElectionId] = useState(
    store.elections[0]?.id ?? ""
  );
  const [form, setForm] = useState<Voter | "new" | null>(null);
  const [view, setView] = useState<Voter | null>(null);
  const [deleting, setDeleting] = useState<Voter | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const selectedElectionId = store.elections.some(
    (election) => election.id === electionId
  )
    ? electionId
    : store.elections[0]?.id ?? "";

  useEffect(() => {
    if (!backendConnected) return;
    const controller = new AbortController();
    const query = selectedElectionId
      ? `?electionId=${encodeURIComponent(selectedElectionId)}`
      : "";
    const loadTimer = window.setTimeout(() => setLoading(true), 0);

    void getApiJson<ApiVoter[]>(`/api/admin/voters${query}`, {
      signal: controller.signal,
    })
      .then((records) => {
        const constituencyNames = new Map(
          store.constituencies.map((constituency) => [
            Number(constituency.id),
            constituency.name,
          ])
        );
        setVoters(mapApiVoters(records, constituencyNames));
        setLoadedElectionId(selectedElectionId);
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(
            error instanceof Error ? error.message : "Unable to load voters"
          );
        }
      })
      .finally(() => {
        window.clearTimeout(loadTimer);
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
      window.clearTimeout(loadTimer);
    };
  }, [backendConnected, selectedElectionId, setVoters, store.constituencies]);

  const rows = voters.filter(
    (voter) =>
      Object.values(voter).some((value) =>
        String(value).toLowerCase().includes(search.toLowerCase())
      ) &&
      (!filter || voter.constituency === filter)
  );

  const fields: FieldConfig[] = [
    { key: "epic", label: "EPIC number", required: true },
    { key: "name", label: "Full name", required: true },
    {
      key: "constituency",
      label: "Constituency",
      type: "select",
      required: true,
      options: store.constituencies.map((constituency) => constituency.name),
    },
    { key: "dob", label: "Date of birth", type: "date", required: true },
    ...(!backendConnected
      ? [
          {
            key: "participation",
            label: "Demonstration participation status",
            type: "select" as const,
            required: true,
            options: ["Recorded", "Not recorded"],
          },
        ]
      : []),
  ];

  const save = async (value: Record<string, unknown>) => {
    const isNew = form === "new";

    if (backendConnected) {
      const constituency = store.constituencies.find(
        (item) => item.name === value.constituency
      );
      if (!constituency) {
        notify("Select a valid constituency", "error");
        return;
      }

      try {
        const voterRecord = {
          epicNumber: String(value.epic).trim(),
          fullName: String(value.name).trim(),
          dob: String(value.dob),
          constituencyId: Number(constituency.id),
        };
        if (isNew) {
          await getApiJson<{ voter: unknown }>("/api/admin/voters", {
            method: "POST",
            body: JSON.stringify(voterRecord),
          });
        } else {
          await getApiJson<{ voter: unknown }>(
            `/api/admin/voters/${encodeURIComponent((form as Voter).id)}`,
            {
              method: "PATCH",
              body: JSON.stringify(voterRecord),
            }
          );
        }
      } catch (error) {
        notify(
          error instanceof Error ? error.message : "Voter could not be saved",
          "error"
        );
        return;
      }

      setForm(null);
      notify(isNew ? "Voter registered" : "Voter updated");
      try {
        const query = selectedElectionId
          ? `?electionId=${encodeURIComponent(selectedElectionId)}`
          : "";
        const records = await getApiJson<ApiVoter[]>(`/api/admin/voters${query}`);
        const constituencyNames = new Map(
          store.constituencies.map((item) => [
            Number(item.id),
            item.name,
          ])
        );
        setVoters(mapApiVoters(records, constituencyNames));
        setLoadedElectionId(selectedElectionId);
        setLoadError("");
      } catch (error) {
        notify(
          error instanceof Error
            ? `Voter saved, but the directory could not be refreshed: ${error.message}`
            : "Voter saved, but the directory could not be refreshed",
          "error"
        );
        setLoadError("Saved voter data could not be refreshed. Reload the directory.");
      }
      return;
    }

    const item = {
      ...value,
      id: isNew ? nextId("VTR") : (form as Voter).id,
    } as Voter;
    setVoters((current) =>
      isNew
        ? [item, ...current]
        : current.map((voter) => (voter.id === item.id ? item : voter))
    );
    addAudit(
      "Voter",
      isNew ? "CREATE" : "UPDATE",
      item.id,
      "Non-sensitive voter directory record changed"
    );
    notify(`Voter ${isNew ? "registered" : "updated"}`);
    setForm(null);
  };

  const removeVoter = async (voter: Voter) => {
    if (backendConnected) {
      try {
        await getApiJson<{ success: boolean }>(
          `/api/admin/voters/${encodeURIComponent(voter.id)}`,
          { method: "DELETE" }
        );
        setVoters((current) =>
          current.filter((record) => record.id !== voter.id)
        );
        notify("Voter deleted");
      } catch (error) {
        notify(
          error instanceof Error ? error.message : "Voter could not be deleted",
          "error"
        );
      }
      setDeleting(null);
      return;
    }

    setVoters((current) => current.filter((record) => record.id !== voter.id));
    addAudit(
      "Voter",
      "DELETE",
      voter.id,
      "Voter directory record removed"
    );
    notify("Voter record removed");
    setDeleting(null);
  };

  return (
    <>
      <PageHeader
        title="Voters"
        description={
          backendConnected
            ? "Backend voter directory. Participation is shown per election and comes only from the separate has_voted record."
            : "Manage voter directory records. Ballot choices are never stored or displayed."
        }
        action={
          <Button onClick={() => setForm("new")}>
            <Icon name="plus" size={16} /> Register voter
          </Button>
        }
      />

      <div className="privacy-note">
        <Icon name="info" size={17} />
        <span>
          <strong>Privacy notice:</strong>{" "}
          {backendConnected
            ? "EPIC and date-of-birth data are sensitive and visible only to authenticated administrators. Participation status comes from has_voted; ballot choices remain anonymous and are never queried here. Voters with participation records cannot be deleted."
            : "Voter records are held in memory for this session only. Participation status does not indicate a ballot choice."}
        </span>
      </div>

      <Filters search={search} setSearch={setSearch}>
        <select
          aria-label="Filter by constituency"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="">All constituencies</option>
          {store.constituencies.map((constituency) => (
            <option key={constituency.id} value={constituency.name}>
              {constituency.name}
            </option>
          ))}
        </select>
        {backendConnected && (
          <select
            aria-label="Participation election"
            value={selectedElectionId}
            onChange={(event) => setElectionId(event.target.value)}
          >
            <option value="">No election selected</option>
            {store.elections.map((election) => (
              <option key={election.id} value={election.id}>
                {election.name}
              </option>
            ))}
          </select>
        )}
      </Filters>

      {backendConnected && !selectedElectionId && (
        <p className="empty">
          No ongoing election is available; participation status is unavailable.
        </p>
      )}
      {loading && <p>Loading voter directory…</p>}
      {loadError && <p className="error">{loadError}</p>}

      <DataTable
        rows={rows}
        columns={[
          { key: "id", label: "Voter ID" },
          { key: "epic", label: "EPIC number" },
          { key: "name", label: "Full name" },
          { key: "constituency", label: "Constituency" },
          {
            key: "dob",
            label: "Date of birth",
            render: (voter) => formatDate(voter.dob),
          },
          {
            key: "participation",
            label: "Participation",
            render: (voter) => {
              if (backendConnected && loadedElectionId !== selectedElectionId) {
                return "Loading…";
              }
              return voter.participation === "Unavailable" ? (
                "Unavailable"
              ) : (
                <Badge value={voter.participation} />
              );
            },
          },
        ]}
        pageSize={25}
        onView={setView}
        onEdit={(voter) => setForm(voter)}
        onDelete={setDeleting}
      />

      {form && (
        <EntityForm
          title={form === "new" ? "Register voter" : "Edit voter"}
          fields={fields}
          initial={
            form === "new"
              ? {
                  epic: "",
                  name: "",
                  constituency: "",
                  dob: "",
                  participation: "Not recorded",
                }
              : form
          }
          onSave={(value) => void save(value)}
          onClose={() => setForm(null)}
        />
      )}

      {view && (
        <Detail
          title="Voter details"
          record={view}
          onClose={() => setView(null)}
        />
      )}

      {deleting && (
        <Confirm
          title="Remove voter record?"
          message={
            backendConnected
              ? `Permanently remove ${deleting.name}? This is unavailable if participation records reference the voter.`
              : `Remove the local record for ${deleting.name}?`
          }
          onClose={() => setDeleting(null)}
          onConfirm={() => void removeVoter(deleting)}
        />
      )}
    </>
  );
}
