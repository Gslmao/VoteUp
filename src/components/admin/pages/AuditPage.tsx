"use client";

import React, { useEffect, useState } from "react";
import { Audit, Store } from "@/types/portal";
import { ApiAudit, getApiJson, mapApiAudits } from "@/lib/portalBackend";
import { PageHeader } from "@/components/ui/PageHeader";
import { Filters } from "@/components/ui/Filters";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";

interface AuditPageProps {
  store: Store;
  backendConnected: boolean;
  notify: (text: string, tone?: "success" | "error") => void;
}

export function AuditPage({ store, backendConnected, notify }: AuditPageProps) {
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("");
  const [operation, setOperation] = useState("");
  const [backendAudits, setBackendAudits] = useState<Audit[] | null>(null);

  useEffect(() => {
    if (!backendConnected) return;
    void getApiJson<ApiAudit[]>("/api/admin/audit")
      .then((records) => setBackendAudits(mapApiAudits(records)))
      .catch((error: unknown) => {
        notify(
          error instanceof Error ? error.message : "Audit history could not be loaded",
          "error"
        );
      });
  }, [backendConnected, notify]);

  const audits = backendConnected ? backendAudits ?? [] : store.audits;
  const rows = audits.filter(
    (a) =>
      Object.values(a).some((v) =>
        String(v).toLowerCase().includes(search.toLowerCase())
      ) &&
      (!entity || a.entity === entity) &&
      (!operation || a.operation === operation)
  );

  const entityOptions = Array.from(new Set(audits.map((a) => a.entity)));
  const operationOptions = Array.from(
    new Set(audits.map((a) => a.operation))
  );

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Read-only record of non-sensitive administrative activity."
      />

      <Filters search={search} setSearch={setSearch}>
        <select
          aria-label="Filter by entity"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
        >
          <option value="">All entities</option>
          {entityOptions.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by operation"
          value={operation}
          onChange={(e) => setOperation(e.target.value)}
        >
          <option value="">All operations</option>
          {operationOptions.map((x) => (
            <option key={x} value={x}>
              {x.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </Filters>

      <DataTable
        rows={rows}
        columns={[
          {
            key: "timestamp",
            label: "Timestamp",
            render: (r) => new Date(r.timestamp).toLocaleString("en-IN"),
          },
          { key: "entity", label: "Entity" },
          {
            key: "operation",
            label: "Operation",
            render: (r) => <Badge value={r.operation} />,
          },
          { key: "reference", label: "Record reference" },
          { key: "details", label: "Relevant details" },
        ]}
      />
    </>
  );
}
